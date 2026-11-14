import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

export type Size = { width: number; height: number };

/**
 * The real size of a view, from its layout. Full-screen canvases use this rather than the window
 * dimensions, which on Android can leave out the area behind the navigation bar.
 */
export function useMeasuredSize() {
  const [size, setSize] = useState<Size | null>(null);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current?.width === width && current.height === height ? current : { width, height },
    );
  }, []);

  return { size, onLayout };
}
