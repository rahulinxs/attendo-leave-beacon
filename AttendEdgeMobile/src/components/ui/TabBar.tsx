import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ViewStyle, TextStyle, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import Text from './Text';
import Badge from './Badge';

export interface TabItem {
  key: string;
  title: string;
  icon?: React.ReactNode;
  badge?: number | string | boolean;
  badgeVariant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'outline';
  disabled?: boolean;
}

interface TabBarProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  style?: ViewStyle;
  tabStyle?: ViewStyle;
  activeTabStyle?: ViewStyle;
  textStyle?: TextStyle;
  activeTextStyle?: TextStyle;
  indicatorStyle?: ViewStyle;
  scrollable?: boolean;
  variant?: 'primary' | 'secondary' | 'underline' | 'pill';
  fullWidth?: boolean;
  showIndicator?: boolean;
  badgeStyle?: ViewStyle;
  badgeTextStyle?: TextStyle;
}

const TabBar: React.FC<TabBarProps> = ({
  items,
  activeKey,
  onChange,
  style,
  tabStyle,
  activeTabStyle,
  textStyle,
  activeTextStyle,
  indicatorStyle,
  scrollable = false,
  variant = 'primary',
  fullWidth = false,
  showIndicator = true,
  badgeStyle,
  badgeTextStyle,
}) => {
  const insets = useSafeAreaInsets();
  const [tabLayouts, setTabLayouts] = useState<Record<string, { x: number; width: number }>>({});

  const handleTabLayout = useCallback(
    (key: string, event: any) => {
      const { x, width } = event.nativeEvent.layout;
      setTabLayouts((prev) => ({
        ...prev,
        [key]: { x, width },
      }));
    },
    []
  );

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          container: {
            backgroundColor: theme.colors.backgroundLight,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
          tab: {
            paddingVertical: theme.spacing.m,
            paddingHorizontal: theme.spacing.m,
          },
          activeTab: {
            backgroundColor: theme.colors.backgroundLight,
          },
          text: {
            color: theme.colors.textSecondary,
          },
          activeText: {
            color: theme.colors.primary,
            fontWeight: '600',
          },
          indicator: {
            height: 2,
            backgroundColor: theme.colors.primary,
            position: 'absolute',
            bottom: 0,
            left: 0,
          },
        };
      case 'underline':
        return {
          container: {
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
          tab: {
            paddingVertical: theme.spacing.m,
            paddingHorizontal: theme.spacing.l,
          },
          activeTab: {},
          text: {
            color: theme.colors.textSecondary,
          },
          activeText: {
            color: theme.colors.primary,
            fontWeight: '600',
          },
          indicator: {
            height: 2,
            backgroundColor: theme.colors.primary,
            position: 'absolute',
            bottom: 0,
            left: 0,
          },
        };
      case 'pill':
        return {
          container: {
            backgroundColor: theme.colors.backgroundLight,
            borderRadius: theme.borderRadius.l,
            padding: theme.spacing.xs,
            margin: theme.spacing.m,
          },
          tab: {
            paddingVertical: theme.spacing.s,
            paddingHorizontal: theme.spacing.l,
            borderRadius: theme.borderRadius.m,
          },
          activeTab: {
            backgroundColor: theme.colors.primary,
          },
          text: {
            color: theme.colors.textSecondary,
          },
          activeText: {
            color: theme.colors.white,
            fontWeight: '600',
          },
          indicator: {},
        };
      case 'primary':
      default:
        return {
          container: {
            backgroundColor: theme.colors.primary,
          },
          tab: {
            paddingVertical: theme.spacing.m,
            paddingHorizontal: theme.spacing.l,
          },
          activeTab: {
            borderBottomWidth: 2,
            borderBottomColor: theme.colors.white,
          },
          text: {
            color: 'rgba(255, 255, 255, 0.7)',
          },
          activeText: {
            color: theme.colors.white,
            fontWeight: '600',
          },
          indicator: {},
        };
    }
  };

  const variantStyles = getVariantStyles();
  const activeTabLayout = tabLayouts[activeKey];

  const renderTab = (item: TabItem) => {
    const isActive = activeKey === item.key;
    const hasBadge = item.badge !== undefined && item.badge !== false;

    return (
      <TouchableOpacity
        key={item.key}
        style={[
          styles.tab,
          variantStyles.tab,
          tabStyle,
          isActive && [variantStyles.activeTab, activeTabStyle],
          fullWidth && styles.fullWidthTab,
          item.disabled && styles.disabledTab,
        ]}
        onPress={() => !item.disabled && onChange(item.key)}
        onLayout={(event) => handleTabLayout(item.key, event)}
        disabled={item.disabled}
        activeOpacity={0.7}
      >
        <View style={styles.tabContent}>
          {item.icon && <View style={styles.iconContainer}>{item.icon}</View>}
          <Text
            style={[
              styles.text,
              variantStyles.text,
              textStyle,
              isActive && [variantStyles.activeText, activeTextStyle],
              item.disabled && styles.disabledText,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {hasBadge && (
            <Badge
              variant={item.badgeVariant || 'error'}
              size="sm"
              style={[styles.badge, badgeStyle]}
              textStyle={badgeTextStyle}
              count={typeof item.badge === 'number' ? item.badge : undefined}
              showCount={typeof item.badge === 'number'}
              dot={typeof item.badge === 'boolean'}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderScrollableTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContainer, { paddingHorizontal: insets.left || theme.spacing.m }]}
    >
      {items.map(renderTab)}
    </ScrollView>
  );

  const renderStaticTabs = () => (
    <View style={styles.tabsContainer}>
      {items.map(renderTab)}
    </View>
  );

  return (
    <View style={[styles.container, variantStyles.container, style]}>
      {scrollable ? renderScrollableTabs() : renderStaticTabs()}
      {showIndicator && activeTabLayout && variantStyles.indicator && (
        <View
          style={[
            styles.indicator,
            variantStyles.indicator,
            {
              width: activeTabLayout.width,
              transform: [{ translateX: activeTabLayout.x }],
            },
            indicatorStyle,
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'relative',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthTab: {
    flex: 1,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: theme.spacing.xs,
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
  },
  disabledTab: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: theme.colors.primary,
  },
  badge: {
    marginLeft: theme.spacing.xs,
  },
});

export default TabBar;
