/*
 * @flow
 */

import React, { Component, createContext } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const screenWidth = Dimensions.get('window').width;

// ✅ NEW: create modern Context for placeholders
export const PlaceholderContext = createContext({
  position: new Animated.Value(0),
  animatedComponent: null,
  registerPlaceholder: () => {},
});

type PlaceholderContainerProps = {
  duration: number,
  delay: number,
  style: Object,
  animatedComponent: React.Element<*>,
  loader: Function,
  replace: boolean,
};

type PlaceholderContainerState = {
  ContainerComponent: Object,
  AnimatedComponent: Object,
  startPosition: number,
  stopPosition: number,
  isContainerComponentMeasured: boolean,
  isAnimatedComponentMeasured: boolean,
  Component: React.Element<*>,
};

export default class PlaceholderContainer extends Component<
  PlaceholderContainerProps,
  PlaceholderContainerState
> {
  position: Animated.Value;
  placeholders: Array<React.Element<*>>;

  constructor(props: PlaceholderContainerProps) {
    super(props);
    this.state = {
      ContainerComponent: {x: 0, y: 0, width: 0, height: 0},
      AnimatedComponent: {x: 0, y: 0, width: 0, height: 0},
      startPosition: 0,
      stopPosition: 0,
      isContainerComponentMeasured: false,
      isAnimatedComponentMeasured: false,
      Component: null,
    };
    this.position = new Animated.Value(0);
    this.placeholders = [];

    this._measureContainerComponent = this._measureView.bind(
      null,
      'ContainerComponent',
    );
    this._measureAnimatedComponent = this._measureView.bind(
      null,
      'AnimatedComponent',
    );
  }

  componentDidMount(): void {
    const {loader, replace} = this.props;
    if (loader) {
      Promise.resolve(loader).then(Component => {
        if (!replace) this.setState({Component});
        else this._replacePlaceholders();
      });
    }
  }

  componentWillUnmount(): void {
    this.position.stopAnimation();
  }

  render(): React.Element<*> {
    const {style, animatedComponent, children} = this.props;
    const {Component, isAnimatedComponentMeasured} = this.state;

    return (
      <View
        ref={ref => {
          this.containerRef = ref;
        }}
        onLayout={this._measureContainerComponent}
        style={style}>
        {!isAnimatedComponentMeasured && (
          <View
            ref={ref => {
              this.componentRef = ref;
            }}
            onLayout={this._measureAnimatedComponent}
            style={styles.offscreen}>
            {animatedComponent}
          </View>
        )}

        {/* ✅ wrap children with modern context provider */}
        <PlaceholderContext.Provider
          value={{
            position: this.position,
            animatedComponent: animatedComponent,
            registerPlaceholder: this._registerPlaceholder,
          }}>
          {(Component && Component) || children}
        </PlaceholderContext.Provider>
      </View>
    );
  }

  _triggerAnimation = (): void => {
    const {duration, delay} = this.props;
    const {startPosition, stopPosition} = this.state;

    Animated.loop(
      Animated.sequence([
        Animated.timing(this.position, {
          toValue: stopPosition || screenWidth,
          duration: duration,
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(this.position, {
          toValue: startPosition || 0,
          duration: 0,
          delay: delay || 0,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    ).start();
  };

  _startAndRepeat = (): void => {
    const {Component} = this.state;
    if (!Component) this._triggerAnimation();
  };

  _measureView = (viewName: string, event: Object): void => {
    const {x, y, height, width} = event.nativeEvent.layout;
    this.setState(
      () => ({
        [viewName]: {x, y, height, width},
        [`is${viewName}Measured`]: true,
      }),
      () => {
        this._setAnimationPositions();
      },
    );
  };

  _setAnimationPositions = (): void => {
    const {
      ContainerComponent,
      AnimatedComponent,
      isContainerComponentMeasured,
      isAnimatedComponentMeasured,
    } = this.state;
    if (!isContainerComponentMeasured || !isAnimatedComponentMeasured) return;

    const startPosition = -(ContainerComponent.x + AnimatedComponent.width);
    const stopPosition =
      ContainerComponent.x +
      ContainerComponent.width +
      AnimatedComponent.width;

    this.setState(
      () => ({
        startPosition,
        stopPosition,
      }),
      () => {
        this.position.setValue(startPosition);
        this._startAndRepeat();
      },
    );
  };

  _registerPlaceholder = (placeholder: React.Element<*>): void => {
    const {replace} = this.props;
    if (!replace) return;
    this.placeholders.push(placeholder);
  };

  _replacePlaceholders = (): void => {
    try {
      this.placeholders.forEach(placeholder => {
        if (placeholder && placeholder._resolve) {
          placeholder._resolve();
        }
      });
    } catch (e) {
      console.log('Something went wrong replacing placeholders:', e);
    }
  };
}

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: -1000,
  },
});
