"use client";
import { useEffect, useState } from "react";
import { trpc } from "@web/app/trpc";

const Clientside = () => {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    trpc.hello.query({ name: "clientside" }).then((res) => {
      setGreeting(res);
    });
  });

  return <div>Client side {greeting}</div>;
};

export default Clientside;
