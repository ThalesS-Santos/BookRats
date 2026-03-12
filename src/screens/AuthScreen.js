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
import { useBookStore } from '../store/useBookStore';
import { Ionicons } from '@expo/vector-icons';

const AuthScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const { signIn, signUp, signInWithGoogle, loading, authError } = useBookStore();

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

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 bg-[#0F172A] justify-center px-8"
            >
                <View className="items-center mb-10">
                    <View className="bg-[#22C55E20] p-4 rounded-full mb-4 border border-[#22C55E40]">
                        <Ionicons name="book" size={50} color="#22C55E" />
                    </View>
                    <Text className="text-4xl font-bold text-white tracking-widest">
                        BOOK<Text className="text-[#22C55E]">RATS</Text>
                    </Text>
                    <Text className="text-[#94A3B8] mt-2 font-medium">
                        {isLogin ? 'Bem-vindo de volta, leitor!' : 'Comece sua jornada literária'}
                    </Text>
                </View>

                <View className="space-y-4">
                    <View>
                        <Text className="text-[#94A3B8] mb-2 ml-1 text-sm font-semibold uppercase tracking-wider">E-mail</Text>
                        <View className="flex-row items-center bg-[#1E293B] rounded-2xl px-4 border border-[#334155]">
                            <Ionicons name="mail-outline" size={20} color="#94A3B8" />
                            <TextInput
                                className="flex-1 h-14 text-white ml-3"
                                placeholder="seu@email.com"
                                placeholderTextColor="#475569"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View>
                        <Text className="text-[#94A3B8] mb-2 ml-1 text-sm font-semibold uppercase tracking-wider">Senha</Text>
                        <View className="flex-row items-center bg-[#1E293B] rounded-2xl px-4 border border-[#334155]">
                            <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
                            <TextInput
                                className="flex-1 h-14 text-white ml-3"
                                placeholder="••••••••"
                                placeholderTextColor="#475569"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons
                                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color="#94A3B8"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        className={`h-16 rounded-2xl flex-row items-center justify-center mt-4 border ${loading ? 'opacity-70' : ''}`}
                        style={{ backgroundColor: '#22C55E', shadowColor: '#22C55E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}
                        onPress={handleAuth}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#0F172A" />
                        ) : (
                            <>
                                <Text className="text-[#0F172A] text-lg font-bold mr-2">
                                    {isLogin ? 'Entrar' : 'Criar Conta'}
                                </Text>
                                <Ionicons name="arrow-forward" size={20} color="#0F172A" />
                            </>
                        )}
                    </TouchableOpacity>

                    <View className="flex-row items-center my-6">
                        <View className="flex-1 h-[1px] bg-[#334155]" />
                        <Text className="text-[#94A3B8] mx-4 text-xs font-bold uppercase tracking-widest">Ou continue com</Text>
                        <View className="flex-1 h-[1px] bg-[#334155]" />
                    </View>

                    <TouchableOpacity
                        className="h-16 rounded-2xl flex-row items-center justify-center bg-[#1E293B] border border-[#334155]"
                        onPress={() => signInWithGoogle()}
                        disabled={loading}
                    >
                        <Ionicons name="logo-google" size={20} color="#white" />
                        <Text className="text-white text-lg font-bold ml-3">Google</Text>
                    </TouchableOpacity>

                    <View className="flex-row justify-center items-center mt-6">
                        <Text className="text-[#94A3B8]">
                            {isLogin ? 'Não tem uma conta?' : 'Já possui uma conta?'}
                        </Text>
                        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                            <Text className="text-[#22C55E] font-bold ml-2">
                                {isLogin ? 'Cadastre-se' : 'Faça Login'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {!isLogin && (
                    <Text className="text-[#475569] text-center text-xs mt-8 px-4">
                        Ao criar uma conta, você concorda em manter seu hábito de leitura sempre ativo! 📚🔥
                    </Text>
                )}
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    );
};

export default AuthScreen;
