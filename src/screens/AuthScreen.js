import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useBookStore } from '../store/useBookStore';
import { useThemeStore } from '../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

const AuthScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const { signIn, signUp, signInWithGoogle, loading, authError } = useBookStore();
    const { isDarkMode } = useThemeStore();

    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        webClientId: '938992066464-mka61a63o33ltrr2fobm18qugoq35j7d.apps.googleusercontent.com',
        androidClientId: '938992066464-mka61a63o33ltrr2fobm18qugoq35j7d.apps.googleusercontent.com',
        iosClientId: '938992066464-mka61a63o33ltrr2fobm18qugoq35j7d.apps.googleusercontent.com',
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            signInWithGoogle(id_token);
        }
    }, [response]);

    useEffect(() => {
        if (authError) {
            Alert.alert('Erro de Autenticação', authError);
        }
    }, [authError]);

    const validateEmail = (email) => {
        return /\S+@\S+\.\S+/.test(email);
    };

    const handleAuth = async () => {
        if (!validateEmail(email)) {
            Alert.alert('Erro', 'Por favor, insira um e-mail válido.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (isLogin) {
            await signIn(email, password);
        } else {
            await signUp(email, password);
        }
    };

    // Theme Variables
    const bgColor = isDarkMode ? 'bg-[#000000]' : 'bg-[#FDFCF5]';
    const textColor = isDarkMode ? 'text-[#E0E0E0]' : 'text-[#1A1A1A]';
    const subTextColor = isDarkMode ? 'text-[#A3A3A3]' : 'text-[#71717A]';
    const primaryColorHex = isDarkMode ? '#A7C9A7' : '#5B8C5A';
    const primaryColorClass = isDarkMode ? 'text-[#A7C9A7]' : 'text-[#5B8C5A]';
    
    const inputBgColor = isDarkMode ? 'bg-[#171717]' : 'bg-[#FFFFFF]';
    const inputBorderColor = isDarkMode ? 'border-[#262626]' : 'border-[#E5E7EB]';
    const iconColor = isDarkMode ? '#A3A3A3' : '#A1A1AA';
    const placeholderColor = isDarkMode ? '#52525B' : '#A1A1AA';

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className={`flex-1 justify-center px-8 ${bgColor}`}
            >
                <View className="items-center mb-10">
                    <View className={`p-4 rounded-full mb-4 border`} style={{ backgroundColor: `${primaryColorHex}20`, borderColor: `${primaryColorHex}40` }}>
                        <Ionicons name="book" size={50} color={primaryColorHex} />
                    </View>
                    <Text className={`text-4xl font-bold tracking-widest ${textColor}`}>
                        BOOK<Text className={primaryColorClass}>RATS</Text>
                    </Text>
                    <Text className={`mt-2 font-medium ${subTextColor}`}>
                        {isLogin ? 'Bem-vindo de volta, leitor!' : 'Comece sua jornada literária'}
                    </Text>
                </View>

                <View className="space-y-4">
                    <View>
                        <Text className={`mb-2 ml-1 text-sm font-semibold uppercase tracking-wider ${subTextColor}`}>E-mail</Text>
                        <View className={`flex-row items-center rounded-2xl px-4 border ${inputBgColor} ${inputBorderColor}`}>
                            <Ionicons name="mail-outline" size={20} color={iconColor} />
                            <TextInput
                                className={`flex-1 h-14 ml-3 ${textColor}`}
                                placeholder="seu@email.com"
                                placeholderTextColor={placeholderColor}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View>
                        <Text className={`mb-2 ml-1 text-sm font-semibold uppercase tracking-wider ${subTextColor}`}>Senha</Text>
                        <View className={`flex-row items-center rounded-2xl px-4 border ${inputBgColor} ${inputBorderColor}`}>
                            <Ionicons name="lock-closed-outline" size={20} color={iconColor} />
                            <TextInput
                                className={`flex-1 h-14 ml-3 ${textColor}`}
                                placeholder="••••••••"
                                placeholderTextColor={placeholderColor}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons
                                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color={iconColor}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        className={`h-16 rounded-2xl flex-row items-center justify-center mt-4 border ${loading ? 'opacity-70' : ''}`}
                        style={{ backgroundColor: primaryColorHex, borderColor: primaryColorHex }}
                        onPress={handleAuth}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={isDarkMode ? '#000000' : '#FFFFFF'} />
                        ) : (
                            <>
                                <Text className={`text-lg font-bold mr-2 ${isDarkMode ? 'text-[#000000]' : 'text-[#FFFFFF]'}`}>
                                    {isLogin ? 'Entrar' : 'Criar Conta'}
                                </Text>
                                <Ionicons name="arrow-forward" size={20} color={isDarkMode ? '#000000' : '#FFFFFF'} />
                            </>
                        )}
                    </TouchableOpacity>

                    <View className="flex-row items-center my-6">
                        <View className={`flex-1 h-[1px] ${isDarkMode ? 'bg-[#262626]' : 'bg-[#E5E7EB]'}`} />
                        <Text className={`mx-4 text-xs font-bold uppercase tracking-widest ${subTextColor}`}>Ou continue com</Text>
                        <View className={`flex-1 h-[1px] ${isDarkMode ? 'bg-[#262626]' : 'bg-[#E5E7EB]'}`} />
                    </View>

                    <TouchableOpacity
                        className={`h-16 rounded-2xl flex-row items-center justify-center border ${inputBgColor} ${inputBorderColor}`}
                        onPress={() => promptAsync()}
                        disabled={!request || loading}
                    >
                        <Ionicons name="logo-google" size={20} color={iconColor} />
                        <Text className={`text-lg font-bold ml-3 ${textColor}`}>Google</Text>
                    </TouchableOpacity>

                    <View className="flex-row justify-center items-center mt-6">
                        <Text className={subTextColor}>
                            {isLogin ? 'Não tem uma conta?' : 'Já possui uma conta?'}
                        </Text>
                        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                            <Text className={`font-bold ml-2 ${primaryColorClass}`}>
                                {isLogin ? 'Cadastre-se' : 'Faça Login'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {!isLogin && (
                    <Text className={`text-center text-xs mt-8 px-4 ${isDarkMode ? 'text-[#71717A]' : 'text-[#A1A1AA]'}`}>
                        Ao criar uma conta, você concorda em manter seu hábito de leitura sempre ativo! 📚☕
                    </Text>
                )}
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    );
};

export default AuthScreen;

