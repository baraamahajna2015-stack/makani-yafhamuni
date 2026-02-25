import { NextRequest, NextResponse } from 'next/server';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import sharp from 'sharp';
import { reasonOverDetections, type ReasonedElement } from './ai-reasoning';
import { formatActivitiesInArabic, type Activity } from './arabic-formatter';
import { validateDetectedElements } from './element-validation';
import { analyzeEnvironment, buildActivitiesFromEnvironment, type EnvironmentElement } from './environment';
import { refineActivities } from './refinement';
import { inferSceneFromObjects } from './scene-reasoning';
import { enrichElementsWithSafety, validateAndReplaceActivities } from './safety-validation';
import { validateWithVision } from './vision-validation';

export const runtime = 'nodejs';

export type { Activity };

let modelPromise: Promise<Awaited<ReturnType<typeof cocoSsd.load>>> | null = null;

function getModel() {
  if (!modelPromise) {
    modelPromise = cocoSsd.load();
  }
  return modelPromise;
}

export async function POST(req: NextRequest) {
  try {
    console.log("🔥 VISION ROUTE WORKING");
    if (!process.env.OPENAI_API_KEY) {
      console.log("❌ NO OPENAI API KEY FOUND");
    } else {
      console.log("✅ OPENAI API KEY IS SET");
    }
    const formData = await req.formData();

    const imageFile = formData.get('image');
    const ageValue = formData.get('age');
    const userModeValue = formData.get('userMode');

    if (!(imageFile instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    const age = typeof ageValue === 'string' ? Number(ageValue) : NaN;
    if (!age || age <= 0) {
      return NextResponse.json({ error: 'Valid age is required' }, { status: 400 });
    }

    const userMode = (typeof userModeValue === 'string' && (userModeValue === 'parent' || userModeValue === 'therapist'))
      ? userModeValue as 'parent' | 'therapist'
      : 'parent';

    const arrayBuffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Process image with sharp: resize to 300x300 for COCO-SSD and get raw RGB data
    const { data, info } = await sharp(imageBuffer)
      .resize(300, 300, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Convert RGB data to tensor (shape: [height, width, 3]) for COCO-SSD
    const imageTensor = tf.tensor3d(
      new Uint8Array(data),
      [info.height, info.width, 3]
    );

    const model = await getModel();
    const maxNumBoxes = 50;
    // Request more candidates (low minScore) so we can apply 0.25 primary filter and backfill up to 3
    const detections = await model.detect(imageTensor as tf.Tensor3D, maxNumBoxes, 0.05);

    imageTensor.dispose();

    const predictions = detections.map((d) => ({ className: d.class, probability: d.score }));
    const sorted = [...predictions].sort((a, b) => b.probability - a.probability);

    // Remove only "person" class; keep all other detections for min-3 guarantee
    const isPerson = (p: { className: string }) => p.className.toLowerCase().trim() === 'person';
    const nonPerson = sorted.filter((p) => !isPerson(p));

    const THRESHOLD = 0.25;
    const aboveThreshold = nonPerson.filter((p) => p.probability >= THRESHOLD);

    let filteredPredictions: typeof sorted;
    if (aboveThreshold.length >= 3) {
      filteredPredictions = aboveThreshold;
    } else if (aboveThreshold.length > 0) {
      const belowThreshold = nonPerson.filter((p) => p.probability < THRESHOLD);
      filteredPredictions = [...aboveThreshold];
      for (const p of belowThreshold) {
        if (filteredPredictions.length >= 3) {
          break;
        }
        filteredPredictions.push(p);
      }
    } else {
      filteredPredictions = nonPerson.slice(0, 3);
    }

    const labels = filteredPredictions.map((p) => p.className);

    const base64 = imageBuffer.toString('base64');
    console.log("📸 IMAGE BASE64 LENGTH:", base64?.length);
    console.log("📸 IMAGE BASE64 PREVIEW:", base64?.substring(0, 100));

    // OpenAI Vision validation: remove unrealistic detections, correct misclassifications, no fabrication
    let visionLabels = await validateWithVision(imageBuffer, labels);
    // Minimum 3 objects guarantee: backfill from COCO detections if Vision returned fewer
    const MIN_OBJECTS = 3;
    if (visionLabels.length < MIN_OBJECTS) {
      const visionSet = new Set(visionLabels.map((l) => l.toLowerCase().trim()));
      for (const p of filteredPredictions) {
        if (visionSet.size >= MIN_OBJECTS) break;
        const key = p.className.toLowerCase().trim();
        if (!visionSet.has(key)) {
          visionSet.add(key);
          visionLabels = [...visionLabels, p.className];
        }
      }
    }

    // Build predictions for downstream (match vision-validated labels to probabilities)
    const predictionByClass = new Map(
      filteredPredictions.map((p) => [p.className.toLowerCase().trim(), p])
    );
    const predictionsForReason = visionLabels.map((className) => {
      const found = predictionByClass.get(className.toLowerCase().trim());
      return { className, probability: found ? found.probability : 0.8 };
    });

    const reasonedElements: ReasonedElement[] = reasonOverDetections(predictionsForReason);
    const { labels: validatedLabels, reasonedElements: validatedReasonedElements } = validateDetectedElements(
      visionLabels,
      reasonedElements,
      age
    );
    // Guarantee at least 3 real detected objects by backfilling from original predictions (sorted by confidence)
    let finalLabels = [...validatedLabels];
    if (finalLabels.length < 3) {
      const finalSet = new Set(finalLabels.map((l) => l.toLowerCase().trim()));
      for (const p of filteredPredictions) {
        if (finalLabels.length >= 3) break;
        const key = p.className.toLowerCase().trim();
        if (!finalSet.has(key)) {
          finalSet.add(key);
          finalLabels.push(p.className);
        }
      }
    }
    const labelToNameAr = new Map(validatedReasonedElements.map((r) => [r.rawLabel, r.elementNameAr]));

    const elements = analyzeEnvironment(finalLabels);
    enrichElementsWithSafety(elements);
    let envActivities = buildActivitiesFromEnvironment(elements, age, 5);
    envActivities = validateAndReplaceActivities(envActivities, elements, age);
    const refined = refineActivities(envActivities, elements, age);
    const activities: Activity[] = refined.map(({ objectLabel, therapeuticFocus, element, specificSkillSeed, humanizeOffset }) => ({
      objectLabel,
      therapeuticFocus,
      description: '',
      element,
      specificSkillSeed,
      humanizeOffset,
    }));

    const { labelsArabic, activitiesArabic } = formatActivitiesInArabic(
      activities,
      finalLabels,
      age,
      userMode,
      labelToNameAr
    );
    const labelsArabicWithReasoning = finalLabels.map(
      (label, i) => labelToNameAr.get(label) ?? labelsArabic[i]
    );

    const environmentSummary = inferSceneFromObjects(finalLabels);

    return NextResponse.json({
      age,
      labels: finalLabels,
      labelsArabic: labelsArabicWithReasoning,
      activities,
      activitiesArabic,
      userMode,
      reasonedElements: validatedReasonedElements,
      ...(environmentSummary != null && { environmentSummary }),
    });
  } catch (err) {
    console.error('Error in /api/analyze:', err);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}
