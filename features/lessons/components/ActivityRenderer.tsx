import React from "react";
import { View } from "react-native";
import {
  ActivityLifecycleState,
  LessonActivity,
  TapChoiceActivityData,
  ImageMatchingActivityData,
  DragDropActivityData,
  CountingActivityData,
  MemoryActivityData,
} from "../types";
import { TapChoiceActivity } from "./TapChoiceActivity";
import { ImageMatchingActivity } from "./ImageMatchingActivity";
import { DragDropActivity } from "./DragDropActivity";
import { CountingActivity } from "./CountingActivity";
import { MemoryActivity } from "./MemoryActivity";

export interface ActivityRendererProps {
  activity: LessonActivity;
  selectedOptionId: string | null;
  lifecycleState: ActivityLifecycleState;
  onSelectOption: (optionId: string) => void;
  onCompleteActivity?: () => void;
  onRecordAttempt?: (isCorrect: boolean, report?: any) => void;
  onRetry: () => void;
  onDragStateChange?: (isDragging: boolean) => void;
}

/**
 * Extensible Activity Renderer.
 *
 * Routes activity definitions to their corresponding interactive components.
 * Supports Tap Choice, Image Matching, Drag & Drop, Counting, and Memory activities.
 */
export const ActivityRenderer: React.FC<ActivityRendererProps> = ({
  activity,
  selectedOptionId,
  lifecycleState,
  onSelectOption,
  onCompleteActivity,
  onRecordAttempt,
  onRetry,
  onDragStateChange,
}) => {
  switch (activity.type) {
    case "memory":
      return (
        <MemoryActivity
          activity={activity as MemoryActivityData}
          lifecycleState={lifecycleState}
          onComplete={onCompleteActivity || (() => onSelectOption("complete"))}
          onRecordAttempt={onRecordAttempt}
        />
      );

    case "counting":
      return (
        <CountingActivity
          activity={activity as CountingActivityData}
          lifecycleState={lifecycleState}
          onComplete={onCompleteActivity || (() => onSelectOption("complete"))}
          onRecordAttempt={onRecordAttempt}
          onSelectOption={onSelectOption}
        />
      );

    case "drag_drop":
      return (
        <DragDropActivity
          activity={activity as DragDropActivityData}
          lifecycleState={lifecycleState}
          onComplete={onCompleteActivity || (() => onSelectOption("complete"))}
          onRecordAttempt={onRecordAttempt}
          onDragStateChange={onDragStateChange}
        />
      );

    case "image_matching":
      return (
        <ImageMatchingActivity
          activity={activity as ImageMatchingActivityData}
          lifecycleState={lifecycleState}
          onComplete={onCompleteActivity || (() => onSelectOption("complete"))}
          onRecordAttempt={onRecordAttempt}
        />
      );

    case "tap_choice":
    case "choice":
    default:
      return (
        <TapChoiceActivity
          activity={activity as TapChoiceActivityData}
          selectedOptionId={selectedOptionId}
          lifecycleState={lifecycleState}
          onSelectOption={onSelectOption}
          onRetry={onRetry}
        />
      );
  }
};
