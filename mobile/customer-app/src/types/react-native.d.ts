import * as React from 'react';
import 'react-native';

declare module 'react-native' {
  export class FlatList<ItemT = any> extends React.Component<any, any> {
    scrollToEnd(params?: { animated?: boolean }): void;
    scrollToIndex(params: { animated?: boolean; index: number; viewOffset?: number; viewPosition?: number }): void;
    scrollToOffset(params: { animated?: boolean; offset: number }): void;
  }
  export class KeyboardAvoidingView extends React.Component<any, any> {}
  export class SafeAreaView extends React.Component<any, any> {}
  export interface KeyboardStatic {
    addListener(
      eventType:
        | 'keyboardWillShow'
        | 'keyboardDidShow'
        | 'keyboardWillHide'
        | 'keyboardDidHide'
        | 'keyboardWillChangeFrame'
        | 'keyboardDidChangeFrame',
      listener: (event: any) => void
    ): { remove: () => void };
    dismiss(): void;
    isVisible(): boolean;
  }
  export const Keyboard: KeyboardStatic;
}

declare module '@expo/vector-icons/build/createIconSet' {
  export interface IconProps<GLYPHS extends string> {
    style?: any;
  }
}
