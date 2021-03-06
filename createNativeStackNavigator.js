import React from 'react';
import { StyleSheet } from 'react-native';
import {
  StackRouter,
  SceneView,
  StackActions,
  createNavigator,
} from 'react-navigation';
import { ScreenStack, Screen } from 'react-native-cool-modals';

function renderComponentOrThunk(componentOrThunk, props) {
  if (typeof componentOrThunk === 'function') {
    return componentOrThunk(props);
  }
  return componentOrThunk;
}

const REMOVE_ACTION = 'NativeStackNavigator/REMOVE';

class StackView extends React.Component {
  _removeScene = route => {
    this.props.navigation.dispatch({
      type: REMOVE_ACTION,
      immediate: true,
      key: route.key,
    });
  };

  _onAppear = (route, descriptor) => {
    descriptor.options &&
      descriptor.options.onAppear &&
      descriptor.options.onAppear();
    this.props.navigation.dispatch(
      StackActions.completeTransition({
        toChildKey: route.key,
        key: this.props.navigation.state.key,
      })
    );
  };

  _onFinishTransitioning = () => {
    const { routes } = this.props.navigation.state;
    let lastRoute = routes && routes.length && routes[routes.length - 1];
    if (lastRoute) {
      this.props.navigation.dispatch(
        StackActions.completeTransition({
          toChildKey: lastRoute.key,
          key: this.props.navigation.state.key,
        })
      );
    }
  };

  _renderScene = (index, route, descriptor) => {
    const { navigation, getComponent, options } = descriptor;
    const { mode, transparentCard } = this.props.navigationConfig;
    const SceneComponent = getComponent();

    let stackPresentation = 'push';
    const {
      customStack,
      topOffset,
      showDragIndicator,
      allowsDragToDismiss,
      allowsTapToDismiss,
      anchorModaltoLongForm,
      backgroundColor,
      backgroundOpacity,
      blocksBackgroundTouches,
      cornerRadius,
      headerHeight,
      isShortFormEnabled,
      shortFormHeight,
      springDamping,
      startFromShortForm,
      transitionDuration,
    } = options;

    if (mode === 'modal' || mode === 'containedModal') {
      stackPresentation = mode;
      if (transparentCard || options.cardTransparent) {
        stackPresentation =
          mode === 'containedModal'
            ? 'containedTransparentModal'
            : 'transparentModal';
      }
    }

    let stackAnimation = options.stackAnimation;
    if (options.animationEnabled === false) {
      stackAnimation = 'none';
    }

    const { screenProps } = this.props;
    return (
      <Screen
        allowsDragToDismiss={allowsDragToDismiss}
        allowsTapToDismiss={allowsTapToDismiss}
        anchorModaltoLongForm={anchorModaltoLongForm}
        backgroundColor={backgroundColor}
        backgroundOpacity={backgroundOpacity}
        blocksBackgroundTouches={blocksBackgroundTouches}
        headerHeight={headerHeight}
        isShortFormEnabled={isShortFormEnabled}
        shortFormHeight={shortFormHeight}
        springDamping={springDamping}
        startFromShortForm={startFromShortForm}
        transitionDuration={transitionDuration}
        customStack={customStack}
        topOffset={topOffset}
        cornerRadius={cornerRadius}
        showDragIndicator={showDragIndicator}
        key={`screen_${route.key}`}
        style={[StyleSheet.absoluteFill, options.cardStyle]}
        stackAnimation={stackAnimation}
        stackPresentation={stackPresentation}
        pointerEvents={
          index === this.props.navigation.state.routes.length - 1
            ? 'auto'
            : 'none'
        }
        gestureEnabled={
          options.gestureEnabled === undefined ? true : options.gestureEnabled
        }
        onAppear={() => this._onAppear(route, descriptor)}
        onDismissed={() => this._removeScene(route)}>
        <SceneView
          screenProps={screenProps}
          navigation={navigation}
          component={SceneComponent}
        />
      </Screen>
    );
  };

  render() {
    const { navigation, descriptors } = this.props;

    return (
      <ScreenStack
        style={styles.scenes}
        onFinishTransitioning={this._onFinishTransitioning}>
        {navigation.state.routes.map((route, i) =>
          this._renderScene(i, route, descriptors[route.key])
        )}
      </ScreenStack>
    );
  }
}

const styles = StyleSheet.create({
  scenes: { flex: 1 },
});

function createStackNavigator(routeConfigMap, stackConfig = {}) {
  const router = StackRouter(routeConfigMap, stackConfig);

  // belowe we override getStateForAction method in order to add handling for
  // a custom native stack navigation action. The action REMOVE that we want to
  // add works in a similar way to POP, but it does not remove all the routes
  // that sit on top of the removed route. For example if we have three routes
  // [a,b,c] and call POP on b, then both b and c will go away. In case we
  // call REMOVE on b, only b will be removed from the stack and the resulting
  // state will be [a, c]
  const superGetStateForAction = router.getStateForAction;
  router.getStateForAction = (action, state) => {
    if (action.type === REMOVE_ACTION) {
      const { key, immediate } = action;
      let backRouteIndex = state.index;
      if (key) {
        const backRoute = state.routes.find(route => route.key === key);
        backRouteIndex = state.routes.indexOf(backRoute);
      }

      if (backRouteIndex > 0) {
        const newRoutes = [...state.routes];
        newRoutes.splice(backRouteIndex, 1);
        return {
          ...state,
          routes: newRoutes,
          index: newRoutes.length - 1,
          isTransitioning: immediate !== true,
        };
      }
    }
    return superGetStateForAction(action, state);
  };
  // Create a navigator with StackView as the view
  return createNavigator(StackView, router, stackConfig);
}

export default createStackNavigator;
