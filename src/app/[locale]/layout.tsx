import React, { ReactNode } from "react";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { Roboto } from "next/font/google";

const font = Roboto({ subsets: ["latin"], weight: "400" });

type Props = {
  children: ReactNode;
  params: { locale: string };
};

export const generateMetadata = async ({ params: { locale } }: Props) => {
  const messages = (await import(`../../../translations/${locale}.json`))
    .default;

  const t = createTranslator({ locale, messages });

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
  };
};

const LocaleLayout = async ({ children, params: { locale } }: Props) => {
  let messages;
  try {
    messages = (await import(`../../../translations/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body className={font.className}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
