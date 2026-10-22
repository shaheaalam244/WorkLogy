/// <reference types="node" />

declare module 'react' {
  export = React;
  export as namespace React;

  namespace React {
    type ReactNode = any;
    type ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> = any;
    type JSXElementConstructor<P> = ((props: P) => ReactElement<any, any> | null) | (new (props: P) => any);
    type FC<P = {}> = (props: P) => any;
    type ComponentType<P = {}> = FC<P> | (new (props: P) => any);
    type Dispatch<A> = (value: A) => void;
    type SetStateAction<S> = S | ((prevState: S) => S);

    function useState<T>(initialState: T | (() => T)): [T, Dispatch<SetStateAction<T>>];
    function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
    function useMemo<T>(factory: () => T, deps: readonly any[] | undefined): T;
    function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
    function useRef<T>(initialValue?: T): { current: T };
    function useContext<T>(context: any): T;
    function createContext<T>(defaultValue: T): any;
  }
}

declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
    interface ElementClass {}
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

declare module 'react-native' {
  export const View: any;
  export const Text: any;
  export const TouchableOpacity: any;
  export const ScrollView: any;
  export const TextInput: any;
  export const StyleSheet: {
    create<T extends Record<string, any>>(styles: T): T;
    flatten: any;
    hairlineWidth: number;
    absoluteFill: any;
    absoluteFillObject: any;
  };
  export const Alert: {
    alert(title: string, message?: string, buttons?: Array<{ text?: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>): void;
  };
  export const ActivityIndicator: any;
  export const Modal: any;
  export const RefreshControl: any;
  export const Linking: {
    openURL(url: string): Promise<any>;
    canOpenURL(url: string): Promise<boolean>;
  };
  export const Platform: {
    OS: 'ios' | 'android' | 'windows' | 'macos' | 'web';
    select<T>(specifics: { [platform in 'ios' | 'android' | 'windows' | 'macos' | 'web' | 'default']?: T }): T;
  };
  export const Dimensions: {
    get(dim: 'window' | 'screen'): { width: number; height: number; scale: number; fontScale: number };
  };
  export const Image: any;
  export const StatusBar: any;
  export const Switch: any;
}

declare module 'expo-status-bar' {
  export const StatusBar: any;
}

declare module 'expo-secure-store' {
  export function getItemAsync(key: string, options?: any): Promise<string | null>;
  export function setItemAsync(key: string, value: string, options?: any): Promise<void>;
  export function deleteItemAsync(key: string, options?: any): Promise<void>;
}

declare module 'socket.io-client' {
  export interface Socket {
    connected: boolean;
    on(event: string, callback: (...args: any[]) => void): this;
    off(event: string, callback?: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): this;
    disconnect(): this;
  }
  export function io(uri: string, opts?: any): Socket;
}
