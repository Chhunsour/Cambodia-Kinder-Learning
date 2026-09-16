import React, { ReactNode } from "react";
import { 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  ViewStyle, 
  TouchableWithoutFeedback, 
  Keyboard 
} from "react-native";

interface KeyboardSafeViewProps {
  children: ReactNode;
  style?: ViewStyle;
  keyboardVerticalOffset?: number;
  dismissOnTouchOutside?: boolean;
}

export function KeyboardSafeView({
  children,
  style,
  keyboardVerticalOffset = Platform.OS === "ios" ? 64 : 0,
  dismissOnTouchOutside = true,
}: KeyboardSafeViewProps) {
  const content = (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {children}
    </KeyboardAvoidingView>
  );

  if (dismissOnTouchOutside) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        {content}
      </TouchableWithoutFeedback>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
