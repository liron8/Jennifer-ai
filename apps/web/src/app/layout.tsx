import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { RouteProvider } from "@/providers/router-provider";
import { Theme } from "@/providers/theme";
import "@/styles/globals.css";
import { cx } from "@/utils/cx";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: {
        default: "JeniferAI — AI-Powered Command Center for Executive Assistants",
        template: "%s | JeniferAI",
    },
    description:
        "JeniferAI is the intelligent command center for Executive Assistants, Chiefs of Staff, and Executives. Centralize scheduling, task management, communication, and travel coordination with AI-powered automation.",
    keywords: [
        "executive assistant",
        "AI assistant",
        "scheduling",
        "task management",
        "chief of staff",
        "calendar management",
        "meeting coordination",
    ],
    openGraph: {
        title: "JeniferAI — AI-Powered Command Center for Executive Assistants",
        description:
            "Centralize scheduling, task management, communication, and travel coordination with AI-powered automation.",
        siteName: "JeniferAI",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "JeniferAI — AI-Powered Command Center for Executive Assistants",
        description:
            "Centralize scheduling, task management, communication, and travel coordination with AI-powered automation.",
    },
};

export const viewport: Viewport = {
    themeColor: "#7f56d9",
    colorScheme: "light dark",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={cx(inter.variable, "bg-primary antialiased")}>
                <RouteProvider>
                    <Theme>
                        {children}
                        <Toaster 
                            position="top-right"
                            toastOptions={{
                                className: 'bg-primary border-secondary text-primary shadow-lg',
                                duration: 5000,
                            }}
                            richColors
                            closeButton
                        />
                    </Theme>
                </RouteProvider>
            </body>
        </html>
    );
}
