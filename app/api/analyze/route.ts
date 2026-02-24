import { NextRequest, NextResponse } from 'next/server';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import sharp from 'sharp';
import { reasonOverDetections, type ReasonedElement } from './ai-reasoning';
import { formatActivitiesInArabic, type Activity } from './arabic-formatter';
import { validateDetectedElements } from './element-validation';
import { analyzeEnvironment, buildActivitiesFromEnvironment, type EnvironmentElement } from './environment';
import { refineActivities } from './refinement';
import { enrichElementsWithSafety, validateAndReplaceActivities } from './safety-validation';

export const runtime = 'nodejs';

export type { Activity };

let modelPromise: Promise<mobilenet.MobileNet> | null = null;

function getModel() {
  if (!modelPromise) {
    modelPromise = mobilenet.load({ version: 2, alpha: 1.0 });
  }
  return modelPromise;
}

export async function POST(req: NextRequest) {
  try {
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

    // Process image with sharp: resize to 224x224 and get raw RGB data
    const { data, info } = await sharp(imageBuffer)
      .resize(224, 224, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Convert RGB data to tensor (shape: [224, 224, 3])
    // MobileNet expects RGB format
    const imageTensor = tf.tensor3d(
      new Uint8Array(data),
      [info.height, info.width, 3]
    );
    const expanded = imageTensor.expandDims(0);

    const model = await getModel();
    const predictions = await model.classify(expanded as tf.Tensor3D);

    imageTensor.dispose();
    expanded.dispose();

    const forbiddenKeywords = ['face', 'person', 'people', 'man', 'woman', 'boy', 'girl', 'human'];

    const filteredPredictions = predictions.filter((p) => {
      const lower = p.className.toLowerCase();
      return !forbiddenKeywords.some((kw) => lower.includes(kw));
    });
    const labels = filteredPredictions.map((p) => p.className);

    const reasonedElements: ReasonedElement[] = reasonOverDetections(
      filteredPredictions.map((p) => ({ className: p.className, probability: p.probability }))
    );
    const { labels: validatedLabels, reasonedElements: validatedReasonedElements } = validateDetectedElements(
      labels,
      reasonedElements,
      age
    );
    const labelToNameAr = new Map(validatedReasonedElements.map((r) => [r.rawLabel, r.elementNameAr]));

    const elements = analyzeEnvironment(validatedLabels);
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
      validatedLabels,
      age,
      userMode,
      labelToNameAr
    );
    const labelsArabicWithReasoning = validatedLabels.map(
      (label, i) => labelToNameAr.get(label) ?? labelsArabic[i]
    );

    return NextResponse.json({
      age,
      labels: validatedLabels,
      labelsArabic: labelsArabicWithReasoning,
      activities,
      activitiesArabic,
      userMode,
      reasonedElements: validatedReasonedElements,
    });
  } catch (err) {
    console.error('Error in /api/analyze:', err);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}
