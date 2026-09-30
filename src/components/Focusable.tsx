import React from 'react';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import type { FocusableComponentLayout } from '@noriginmedia/norigin-spatial-navigation';

interface FocusableProps {
  focusKey: string;
  onEnter?: () => void;
  onFocus?: () => void;
  onArrow?: (direction: string) => boolean | void;
  className?: string;
  /** When true the item gets the ring without the zoom (used for text blocks). */
  isStatic?: boolean;
  disabled?: boolean;
  /** Scroll the element into view when it gains focus (default true). */
  scroll?: boolean;
  children: React.ReactNode | ((focused: boolean) => React.ReactNode);
}

export const Focusable: React.FC<FocusableProps> = ({
  focusKey,
  onEnter,
  onFocus,
  onArrow,
  className = '',
  isStatic = false,
  disabled = false,
  scroll = true,
  children,
}) => {
  const { ref, focused } = useFocusable({
    focusKey,
    focusable: !disabled,
    onEnterPress: onEnter ? () => onEnter() : undefined,
    onArrowPress: onArrow ? (direction) => onArrow(direction) !== false : undefined,
    onFocus:
      scroll || onFocus
        ? (layout: FocusableComponentLayout) => {
            if (scroll) {
              layout.node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
            onFocus?.();
          }
        : undefined,
  });

  const cls = `focusable ${isStatic ? 'focusable-static' : ''} ${focused ? 'focused' : ''} ${className}`;
  return (
    <div ref={ref} className={cls} role="button" tabIndex={-1} data-focus-key={focusKey}>
      {typeof children === 'function' ? children(focused) : children}
    </div>
  );
};

interface FocusGroupProps {
  focusKey: string;
  className?: string;
  saveLastFocusedChild?: boolean;
  preferredChildFocusKey?: string;
  isFocusBoundary?: boolean;
  children: React.ReactNode;
}

/**
 * A grouping node. Children rendered inside the provider share this group as
 * their spatial parent. Groups are themselves focusable so the engine can use
 * them as waypoints: arrowing into a group descends to its last focused (or
 * spatially preferred) child, which is what powers rail memory.
 */
export const FocusGroup: React.FC<FocusGroupProps> = ({
  focusKey,
  className,
  saveLastFocusedChild = true,
  preferredChildFocusKey,
  isFocusBoundary = false,
  children,
}) => {
  const { ref, focusKey: resolvedKey } = useFocusable({
    focusKey,
    focusable: true,
    trackChildren: true,
    saveLastFocusedChild,
    preferredChildFocusKey,
    isFocusBoundary,
  });
  return (
    <FocusContext.Provider value={resolvedKey}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </FocusContext.Provider>
  );
};
