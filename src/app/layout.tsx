import { ColorSchemeScript, MantineProvider } from "@mantine/core";

import '@mantine/core/styles.css';
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://extension-files.twitch.tv/helper/v1/twitch-ext.min.js"></script>
      </head>
      <body>
        <MantineProvider forceColorScheme="dark">{children}</MantineProvider>
      </body>
    </html>
  );
}
