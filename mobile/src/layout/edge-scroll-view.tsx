import { ScrollView, type ScrollViewProps } from 'react-native'
import { useSideColumn } from './side-rail'

/**
 * A scroll view whose scroll bar keeps to the screen's edge in full screen on the folded Duo. iOS insets scroll bars
 * by the safe area, which still counts the status column after a screen extends over it, so the bar sat at the
 * column's old edge, across the content.
 */
export function EdgeScrollView(props: ScrollViewProps & { ref?: React.Ref<ScrollView> }) {
  return <ScrollView {...useEdgeScrollBar()} {...props} />
}

/** The same for a list (FlatList and the like): spread onto it. */
export function useEdgeScrollBar(): { automaticallyAdjustsScrollIndicatorInsets: boolean } {
  return { automaticallyAdjustsScrollIndicatorInsets: !useSideColumn()?.extended }
}
