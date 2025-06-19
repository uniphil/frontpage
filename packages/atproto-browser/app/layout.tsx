export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>unsupported app</title>
      </head>
      <body>
        <div>
          <p>
            <strong style={{ color: 'tomato' }}>Unsupported: </strong>
            this fork of <a href="https://atproto-browser.vercel.app" rel="nofollow">atproto-browser</a> is no longer supported.
          </p>
        </div>
        {children}
      </body>
    </html>
  );
}
