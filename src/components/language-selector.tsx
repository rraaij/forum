"use client";

import React, { useCallback, useEffect, useState } from "react";
import qs from "query-string";
import { useLocale } from "next-intl";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "primereact/button";

type languageList = {
  [key: string]: {
    name: string;
    flag: string;
  };
};

const LanguageSelector = () => {
  const [language, setLanguage] = useState<string>("nl");
  const locale = useLocale();
  const otherLocale = locale === "nl" ? "en" : "nl";
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const languages: languageList = {
    en: {
      name: "English",
      flag: "",
    },
    nl: {
      name: "Nederlands",
      flag: "",
    },
  };

  useEffect(() => {
    setLanguage(locale);
  }, [locale]);

  const handleChange = useCallback(() => {
    let currentQuery = {};
    let currentPath = "";

    if (params) {
      currentQuery = qs.parse(params.toString());
    }

    if (pathname) {
      currentPath = pathname
        .split("/")
        .filter((s) => s !== "en" && s !== "nl")
        .join("/");
    }

    router.push(
      qs.stringifyUrl(
        {
          url: otherLocale + currentPath,
          query: currentQuery,
        },
        { skipNull: true }
      )
    );
  }, [otherLocale, pathname, router, params]);

  return (
    <div className="flex">
      {Object.keys(languages).map((langKey, index) => (
        <span key={`language-${index}`} className="flex align-items-center">
          <Button
            className="p-button-text p-button-sm"
            data-testid={`language-${langKey}-button`}
            style={{
              opacity: language === langKey ? 1 : 0.5,
              fontWeight: language === langKey ? "bold" : "normal",
              padding: "0.3rem",
              color: "blue",
            }}
            onClick={handleChange}
          >
            {langKey.toUpperCase()}
          </Button>
          {index < Object.keys(languages).length - 1 && (
            <div key={`language-divider${index}`} style={{ color: "blue" }}>
              |
            </div>
          )}
        </span>
      ))}
    </div>
  );
};

export default LanguageSelector;
