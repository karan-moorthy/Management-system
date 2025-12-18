import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { CompletionRateClient } from "./client";

const CompletionRatePage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return <CompletionRateClient />;
};

export default CompletionRatePage;
