import { parseAsBoolean, useQueryState } from "nuqs";

export const useInviteMemberModal = () => {
  const [isOpen, setIsOpen] = useQueryState(
    "invite-member",
    parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true })
  );

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return {
    isOpen,
    open,
    close,
    setIsOpen,
  };
};