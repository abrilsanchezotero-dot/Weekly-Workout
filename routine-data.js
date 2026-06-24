window.ROUTINE_DATA = {
  appName: "Recomp Studio",
  cycle: ["push", "glutesHams", "pull", "quadsArms"],
  defaultSchedule: {
    "0": "rest",
    "1": "push",
    "2": "glutesHams",
    "3": "rest",
    "4": "pull",
    "5": "quadsArms",
    "6": "rest"
  },
  recovery: {
    title: "Active recovery",
    estimatedMinutes: 25,
    items: [
      "Keep your usual daily steps without adding intense cardio.",
      "Do 5–10 minutes of gentle mobility if you feel stiff.",
      "Prioritize sleep, hydration, and enough protein.",
      "If your week changes, use “Next workout” to continue the cycle."
    ]
  },
  routines: {
    push: {
      name: "Day A — Push",
      shortName: "Push",
      focus: "Chest · shoulders · triceps",
      estimatedMinutes: 48,
      exercises: [
        {
          id: "smith-bench-press",
          name: "Smith Machine Bench Press",
          equipment: "Smith machine",
          sets: 4,
          reps: "6–10",
          targetMin: 6,
          targetMax: 10,
          rest: 120,
          travel: "Dumbbell bench press or dumbbell floor press"
        },
        {
          id: "lateral-raises",
          name: "Lateral Raises",
          equipment: "Cable or dumbbells",
          sets: 3,
          reps: "12–20",
          targetMin: 12,
          targetMax: 20,
          rest: 60,
          travel: "Dumbbell or resistance-band lateral raises"
        },
        {
          id: "overhead-cable-triceps",
          name: "Overhead Triceps Extension",
          equipment: "Cable · long head",
          sets: 3,
          reps: "10–15",
          targetMin: 10,
          targetMax: 15,
          rest: 75,
          travel: "Overhead dumbbell or resistance-band triceps extension"
        },
        {
          id: "cable-triceps-pushdown",
          name: "Cable Triceps Pushdown",
          equipment: "Rope or bar",
          sets: 3,
          reps: "12–15",
          targetMin: 12,
          targetMax: 15,
          rest: 60,
          travel: "Resistance-band pushdown or close-grip push-ups"
        },
        {
          id: "matrix-chest-fly",
          name: "Matrix Chest Fly (Optional)",
          equipment: "Matrix machine",
          sets: 2,
          reps: "12–15",
          targetMin: 12,
          targetMax: 15,
          rest: 60,
          travel: "Dumbbell or resistance-band chest fly"
        }
      ]
    },

    glutesHams: {
      name: "Day B — Glutes & Hamstrings",
      shortName: "Glutes",
      focus: "Glutes · hamstrings · posterior chain",
      estimatedMinutes: 52,
      exercises: [
        {
          id: "romanian-deadlift",
          name: "Romanian Deadlift",
          equipment: "Barbell or dumbbells",
          sets: 4,
          reps: "8–10",
          targetMin: 8,
          targetMax: 10,
          rest: 120,
          travel: "Dumbbell Romanian deadlift"
        },
        {
          id: "bulgarian-split-squat",
          name: "Bulgarian Split Squat",
          equipment: "Dumbbells",
          sets: 3,
          reps: "8–12 each leg",
          targetMin: 8,
          targetMax: 12,
          rest: 90,
          travel: "Dumbbell or bodyweight Bulgarian split squat"
        },
        {
          id: "leg-press-high-wide",
          name: "Leg Press",
          equipment: "High and wide foot placement",
          sets: 3,
          reps: "10–15",
          targetMin: 10,
          targetMax: 15,
          rest: 90,
          travel: "Wide-stance goblet squat"
        },
        {
          id: "matrix-hamstring-curl",
          name: "Matrix Hamstring Curl",
          equipment: "Matrix machine",
          sets: 3,
          reps: "10–15",
          targetMin: 10,
          targetMax: 15,
          rest: 75,
          travel: "Sliding hamstring curl with a towel or stability ball"
        }
      ]
    },

    pull: {
      name: "Day C — Pull",
      shortName: "Pull",
      focus: "Back · rear delts · biceps",
      estimatedMinutes: 48,
      exercises: [
        {
          id: "lat-pulldown",
          name: "Lat Pulldown",
          equipment: "Wide or neutral grip",
          sets: 4,
          reps: "8–12",
          targetMin: 8,
          targetMax: 12,
          rest: 90,
          travel: "Resistance-band pulldown anchored overhead"
        },
        {
          id: "seated-cable-row",
          name: "Seated Cable Row",
          equipment: "Neutral grip",
          sets: 3,
          reps: "10–12",
          targetMin: 10,
          targetMax: 12,
          rest: 90,
          travel: "One-arm dumbbell row"
        },
        {
          id: "rear-delt-fly-machine",
          name: "Rear Delt Fly",
          equipment: "Machine",
          sets: 3,
          reps: "12–20",
          targetMin: 12,
          targetMax: 20,
          rest: 60,
          travel: "Bent-over dumbbell rear delt fly"
        },
        {
          id: "hammer-curl",
          name: "Hammer Curl",
          equipment: "Dumbbells",
          sets: 3,
          reps: "10–12",
          targetMin: 10,
          targetMax: 12,
          rest: 15,
          group: "Superset",
          travel: "Dumbbell or resistance-band hammer curl"
        },
        {
          id: "reverse-hammer-curl",
          name: "Reverse Hammer Curl",
          equipment: "Dumbbells",
          sets: 3,
          reps: "10–12",
          targetMin: 10,
          targetMax: 12,
          rest: 60,
          group: "Superset",
          travel: "Dumbbell or resistance-band reverse curl"
        }
      ]
    },

    quadsArms: {
      name: "Day D — Legs & Arms",
      shortName: "Legs",
      focus: "Quads · calves · triceps",
      estimatedMinutes: 47,
      exercises: [
        {
          id: "heel-elevated-goblet-squat",
          name: "Heel-Elevated Goblet Squat",
          equipment: "Dumbbell",
          sets: 3,
          reps: "10–15",
          targetMin: 10,
          targetMax: 15,
          rest: 90,
          travel: "Heel-elevated goblet squat"
        },
        {
          id: "close-stance-split-or-sissy",
          name: "Close-Stance Split Squat / Sissy Squat",
          equipment: "Choose one variation",
          sets: 3,
          reps: "10–12 each leg",
          targetMin: 10,
          targetMax: 12,
          rest: 90,
          travel: "Close-stance split squat or assisted sissy squat"
        },
        {
          id: "standing-calf-raise",
          name: "Standing Calf Raise",
          equipment: "Squat machine",
          sets: 4,
          reps: "15–20",
          targetMin: 15,
          targetMax: 20,
          rest: 60,
          travel: "Standing single-leg calf raise with a dumbbell"
        },
        {
          id: "skull-crushers",
          name: "Skull Crushers",
          equipment: "EZ bar",
          sets: 3,
          reps: "8–12",
          targetMin: 8,
          targetMax: 12,
          rest: 75,
          travel: "Dumbbell skull crushers"
        }
      ]
    }
  }
};
