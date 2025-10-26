"use client";

import React, { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DisputesListTab } from './DisputesListTab';
import { DisputesSuggestionsTab } from './DisputesSuggestionsTab';

export const DisputesContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("list");

  useEffect(() => {
    const applyHash = () => {
      const hash = (typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "") || "list";
      if (hash === "list" || hash === "suggestions") {
        setActiveTab(hash);
      } else {
        setActiveTab("list");
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-800 mb-2">
          Event Dispute
        </h1>
        <p className="text-lg text-gray-700">
          Public view of dispute events and send your suggestions/comments.
        </p>
      </div>

      <Tabs className="w-full">
        <TabsList 
          className="flex w-full mb-6"
          activeTab={activeTab}
          setActiveTab={(value) => {
            setActiveTab(value);
            if (typeof window !== "undefined") {
              const newUrl = `${window.location.pathname}#${value}`;
              window.history.replaceState(null, "", newUrl);
            }
          }}
        >
          <TabsTrigger value="list">
            List
          </TabsTrigger>
          <TabsTrigger value="suggestions">
            Suggestions/Comments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <DisputesListTab />
        </TabsContent>

        <TabsContent value="suggestions">
          <DisputesSuggestionsTab />
        </TabsContent>
      </Tabs>
    </>
  );
};
