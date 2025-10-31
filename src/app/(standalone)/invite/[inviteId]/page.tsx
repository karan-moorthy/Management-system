import { redirect } from "next/navigation";

import { getCurrent } from "@/features/auth/queries";

import { InviteClient } from "./invite-client";

const InvitePage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return <InviteClient />;
};

export default InvitePage;