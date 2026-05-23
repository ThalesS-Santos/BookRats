import React from 'react';

import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity } from 'react-native';

import { Logger } from '@core/services/Logger';
import { useMainStore } from '@core/store';

const TXT_ERROR_TITLE = 'Ops! Algo deu errado.';
const TXT_ERROR_DESC =
  'Encontramos um problema inesperado e já fomos notificados. Tente recarregar a tela.';
const TXT_ERROR_BUTTON = 'Tentar Novamente';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const user = useMainStore.getState().user;
    Logger.error('React ErrorBoundary Caught Exception', error, {
      screenName: this.props.screenName || 'unknown',
      userId: user?.uid || null,
      errorInfo,
      componentStack: errorInfo?.componentStack || null,
      jsStack: error?.stack || null,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-background-light dark:bg-background-dark justify-center items-center px-6">
          <View className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
            <Ionicons name="warning-outline" size={60} color="#EF4444" />
          </View>

          <Text className="text-2xl font-serif font-bold text-text-light dark:text-text-dark text-center mb-3">
            {TXT_ERROR_TITLE}
          </Text>

          <Text className="text-text-muted-light dark:text-text-muted-dark text-center mb-8 px-4 leading-6">
            {TXT_ERROR_DESC}
          </Text>

          <TouchableOpacity
            onPress={this.handleReset}
            className="bg-primary dark:bg-primary-dark w-full p-4 rounded-hero items-center">
            <Text className="text-white font-bold text-lg">
              {TXT_ERROR_BUTTON}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
