import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { Response } from "@/components/response";

export const Route = createFileRoute("/ai")({
	component: RouteComponent,
});

function RouteComponent() {
	const [input, setInput] = useState("");
	const { messages, sendMessage } = useChat({
		transport: new DefaultChatTransport({
			api: `${import.meta.env.VITE_SERVER_URL}/ai`,
		}),
	});

	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const text = input.trim();
		if (!text) return;
		sendMessage({ text });
		setInput("");
	};

	return (
		<div className="grid grid-rows-[1fr_auto] overflow-hidden w-full mx-auto p-4">
			<div className="overflow-y-auto space-y-4 pb-4">
				{messages.length === 0 ? (
					<div className="text-center text-muted-foreground mt-8">
						Ask me anything to get started!
					</div>
				) : (
					messages.map((message) => (
						<div
							key={message.id}
							className={`p-3 rounded-lg ${
								message.role === "user"
									? "bg-primary/10 ml-8"
									: "bg-secondary/20 mr-8"
							}`}
						>
							<p className="text-sm font-semibold mb-1">
								{message.role === "user" ? "You" : "AI Assistant"}
							</p>
							{message.parts?.map((part, index) => {
								if (part.type === "text") {
									return <Response key={index}>{part.text}</Response>;
								}
								return null;
							})}
						</div>
					))
				)}
				<div ref={messagesEndRef} />
			</div>

			<form
				onSubmit={handleSubmit}
				className="w-full flex items-center space-x-2 pt-2 border-t"
			>
				<Input
					name="prompt"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Type your message..."
					className="flex-1"
					autoComplete="off"
					autoFocus
				/>
				<Button type="submit" size="icon">
					<Send size={18} />
				</Button>
			</form>
		</div>
	);
}
