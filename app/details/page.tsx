import { redirect } from "next/navigation";

/**
 * The life certificate used to live at its own route. It is now one service
 * in the catalogue, driven by the same engine as the other ten, so this
 * keeps any bookmark or QR code printed on an old notice working.
 */
export default function LegacyRoute() {
  redirect("/apply/lifecert/details");
}
