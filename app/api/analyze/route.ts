import { NextRequest, NextResponse } from 'next/server';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import sharp from 'sharp';
import { formatActivitiesInArabic } from './arabic-formatter';

export const runtime = 'nodejs';

type TherapeuticFocus = 'sensory_regulation' | 'motor_planning' | 'executive_function' | 'fine_motor' | 'gross_motor' | 'bilateral_coordination';

interface Activity {
  objectLabel: string;
  therapeuticFocus: TherapeuticFocus;
  description: string;
}

function randomChoice<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

let modelPromise: Promise<mobilenet.MobileNet> | null = null;

// Track the last therapeutic focus used to ensure diversity across generations
// This will persist for as long as the serverless instance stays warm.
let lastTherapeuticFocus: TherapeuticFocus | null = null;

// All available therapeutic focus areas
const ALL_THERAPEUTIC_FOCUSES: TherapeuticFocus[] = [
  'sensory_regulation',
  'motor_planning',
  'executive_function',
  'fine_motor',
  'gross_motor',
  'bilateral_coordination',
];

// Select a therapeutic focus for this generation, ensuring it's different from the last one
function selectTherapeuticFocus(): TherapeuticFocus {
  const available = lastTherapeuticFocus === null
    ? ALL_THERAPEUTIC_FOCUSES
    : ALL_THERAPEUTIC_FOCUSES.filter((f) => f !== lastTherapeuticFocus);
  
  const selected = randomChoice(available);
  lastTherapeuticFocus = selected;
  return selected;
}

function getModel() {
  if (!modelPromise) {
    modelPromise = mobilenet.load({ version: 2, alpha: 1.0 });
  }
  return modelPromise;
}

// Generate activity text based on therapeutic focus

function generateActivityText(label: string, therapeuticFocus: TherapeuticFocus, age: number): string {
  const baseObject = label.split(',')[0].trim().toLowerCase();

  const ageDescriptor =
    age < 4 ? 'toddler' : age < 7 ? 'young child' : age < 11 ? 'older child' : 'pre-teen';

  const durationOptions = ['for one minute', 'for two minutes', 'for three minutes', 'for five minutes'];
  const repetitionOptions = ['three times', 'five times', 'as many times as they can', 'in a slow, controlled way'];
  const directionOptions = [
    'forward and backward',
    'side to side',
    'in a circle',
    'while changing speed',
  ];

  const duration = randomChoice(durationOptions);
  const repetitions = randomChoice(repetitionOptions);
  const directions = randomChoice(directionOptions);

  // Template helpers so we can vary sentence structure while
  // still keeping the core idea clear and age-appropriate.
  const usingObjectOpeners = [
    `Using the ${baseObject}, ask the ${ageDescriptor} to`,
    `With the ${baseObject}, invite the ${ageDescriptor} to`,
    `Give the ${ageDescriptor} the ${baseObject} and encourage them to`,
    `Using the ${baseObject}, have the ${ageDescriptor}`,
  ];

  const neutralChildOpeners = [
    `Ask the ${ageDescriptor} to`,
    `Invite the ${ageDescriptor} to`,
    `Encourage the ${ageDescriptor} to`,
    `Guide the ${ageDescriptor} to`,
  ];

  switch (therapeuticFocus) {
    case 'sensory_regulation':
      return `${randomChoice(usingObjectOpeners)} explore the ${baseObject} with different senses - touching it gently, looking at its colors, listening to any sounds it makes - while breathing slowly and staying calm ${duration}.`;
    case 'motor_planning':
      return `${randomChoice(neutralChildOpeners)} plan how to move the ${baseObject} from one place to another, thinking through each step before starting, then execute the plan ${repetitions}.`;
    case 'executive_function':
      return `${randomChoice(neutralChildOpeners)} create a simple sequence with the ${baseObject} (first do this, then that, finally this) and follow through with the plan ${duration}.`;
    case 'fine_motor':
      return `${randomChoice(usingObjectOpeners)} use their fingers and hands to manipulate the ${baseObject} carefully - picking it up, turning it, placing it precisely ${repetitions} while focusing on smooth, controlled movements.`;
    case 'gross_motor':
      return `${randomChoice(usingObjectOpeners)} move their whole body ${directions} while interacting with the ${baseObject}, using large muscle groups and maintaining balance ${duration}.`;
    case 'bilateral_coordination':
      return `${randomChoice(usingObjectOpeners)} use both hands together to handle the ${baseObject} - one hand stabilizing while the other manipulates, or both hands working in coordination ${repetitions}.`;
    default:
      return `Using the ${baseObject}, create a simple game that encourages movement, attention, and taking turns.`;
  }
}

function buildActivities(labels: string[], age: number): Activity[] {
  const activities: Activity[] = [];
  const usedFocuses: TherapeuticFocus[] = [];
  const availableFocuses = [...ALL_THERAPEUTIC_FOCUSES];

  // Generate activities ensuring each uses a DIFFERENT therapeutic focus
  // Shuffle available focuses to ensure diversity
  const shuffledFocuses = [...availableFocuses].sort(() => Math.random() - 0.5);
  let focusIndex = 0;

  for (const label of labels) {
    // Generate 1-2 activities per object, each with a different focus
    const numberOfActivities = Math.min(2, Math.max(1, Math.floor(Math.random() * 2) + 1));

    for (let i = 0; i < numberOfActivities; i++) {
      // Select a focus that hasn't been used yet
      let selectedFocus: TherapeuticFocus;
      if (focusIndex < shuffledFocuses.length) {
        selectedFocus = shuffledFocuses[focusIndex];
        focusIndex++;
      } else {
        // If we've used all focuses, cycle through remaining ones
        const remaining = ALL_THERAPEUTIC_FOCUSES.filter(f => !usedFocuses.includes(f));
        if (remaining.length > 0) {
          selectedFocus = randomChoice(remaining);
        } else {
          // Reset if all have been used
          usedFocuses.length = 0;
          selectedFocus = randomChoice(ALL_THERAPEUTIC_FOCUSES);
        }
      }

      usedFocuses.push(selectedFocus);
      const description = generateActivityText(label, selectedFocus, age);
      activities.push({
        objectLabel: label,
        therapeuticFocus: selectedFocus,
        description,
      });
    }
  }

  return activities;
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

    const labels = predictions
      .map((p) => p.className)
      .filter((label) => {
        const lower = label.toLowerCase();
        return !forbiddenKeywords.some((kw) => lower.includes(kw));
      });

    const activities = buildActivities(labels, age);

    // Format activities in Arabic
    const { labelsArabic, activitiesArabic } = formatActivitiesInArabic(
      activities,
      labels,
      age,
      userMode
    );

    return NextResponse.json({
      age,
      labels,
      labelsArabic,
      activities,
      activitiesArabic,
      userMode,
    });
  } catch (err) {
    console.error('Error in /api/analyze:', err);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}
