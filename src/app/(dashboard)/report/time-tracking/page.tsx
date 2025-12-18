import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { TimeTrackingClient } from "./client";

const TimeTrackingPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return <TimeTrackingClient />;
};

export default TimeTrackingPage;
