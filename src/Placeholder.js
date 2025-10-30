/*
 * @flow
 */

import React, { Component } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { PlaceholderContext } from './PlaceholderContainer'; // ✅ import shared context
import PropTypes from 'prop-types';

type PlaceholderProps = {
  style: Object,
  animatedComponent: React.Element<*>,
};

type PlaceholderState = {
  x: number,
  width: number,
  isMeasured: boolean,
  resolved: boolean,
};

export default class Placeholder extends Component<
  PlaceholderProps,
  PlaceholderState
> {
  static contextType = PlaceholderContext; // ✅ use modern context
  context: React.ContextType<typeof PlaceholderContext>;

  constructor(props: PlaceholderProps) {
    super(props);
    this.state = {
      x: 0,
      width: 0,
      isMeasured: false,
      resolved: false,
    };
  }

  componentDidMount(): void {
    const ctx = this.context;
    if (ctx && typeof ctx.registerPlaceholder === 'function') {
      ctx.registerPlaceholder(this);
    }
  }

  render(): React.Element<*> {
    const { style, children } = this.props;
    const { x, isMeasured, resolved } = this.state;
    const { animatedComponent, position } = this.context || {};

    if (resolved) {
      return children;
    }

    const animatedStyle = {
      height: '100%',
      width: '100%',
      transform: [{ translateX: position || new Animated.Value(0) }],
      left: -x,
    };

    return (
      <View
        ref={ref => {
          this.testRef = ref;
        }}
        onLayout={this._setDimensions}
        style={[style, styles.overflow]}>
        {isMeasured && animatedComponent && (
          <Animated.View style={animatedStyle}>{animatedComponent}</Animated.View>
        )}
      </View>
    );
  }

  _resolve = () => {
    this.setState(() => ({ resolved: true }));
  };

  _setDimensions = (event): void => {
    const { x } = event.nativeEvent.layout;
    this.setState(() => ({ x, isMeasured: true }));
  };
}

const styles = StyleSheet.create({
  overflow: {
    overflow: 'hidden',
  },
});