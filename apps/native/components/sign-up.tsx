import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";
import { useState } from "react";
import {
	ActivityIndicator,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

export function SignUp() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSignUp = async () => {
		setIsLoading(true);
		setError(null);

		await authClient.signUp.email(
			{
				name,
				email,
				password,
			},
			{
				onError: (error) => {
					setError(error.error?.message || "Failed to sign up");
					setIsLoading(false);
				},
				onSuccess: () => {
					setName("");
					setEmail("");
					setPassword("");
					queryClient.refetchQueries();
				},
				onFinished: () => {
					setIsLoading(false);
				},
			},
		);
	};

	return (
		<View className="mt-6 p-4 bg-card rounded-lg border border-border">
			<Text className="text-lg font-semibold text-foreground mb-4">
				Create Account
			</Text>

			{error && (
				<View className="mb-4 p-3 bg-destructive/10 rounded-md">
					<Text className="text-destructive text-sm">{error}</Text>
				</View>
			)}

			<TextInput
				className="mb-3 p-4 rounded-md bg-input text-foreground border border-input"
				placeholder="Name"
				value={name}
				onChangeText={setName}
				placeholderTextColor="#9CA3AF"
			/>

			<TextInput
				className="mb-3 p-4 rounded-md bg-input text-foreground border border-input"
				placeholder="Email"
				value={email}
				onChangeText={setEmail}
				placeholderTextColor="#9CA3AF"
				keyboardType="email-address"
				autoCapitalize="none"
			/>

			<TextInput
				className="mb-4 p-4 rounded-md bg-input text-foreground border border-input"
				placeholder="Password"
				value={password}
				onChangeText={setPassword}
				placeholderTextColor="#9CA3AF"
				secureTextEntry
			/>

			<TouchableOpacity
				onPress={handleSignUp}
				disabled={isLoading}
				className="bg-primary p-4 rounded-md flex-row justify-center items-center"
			>
				{isLoading ? (
					<ActivityIndicator size="small" color="#fff" />
				) : (
					<Text className="text-primary-foreground font-medium">Sign Up</Text>
				)}
			</TouchableOpacity>
		</View>
	);
}
