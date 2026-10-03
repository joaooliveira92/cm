import { useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { navigateCareer } from "../../navigation/adapter.js";
import { decodeSaveId } from "../../navigation/params.js";
import { RouteParamErrorScreen } from "./RouteParamErrorScreen.js";

/** The index of `/career/$saveId`: no child route → redirect to Squad. */
export const CareerIndexRedirect = () => {
  const params = useParams({ strict: false });
  const saveId = params.saveId ?? "";
  const decoded = decodeSaveId(saveId);
  useEffect(() => {
    if (decoded._tag === "Success") {
      navigateCareer({ type: "squad", saveId: decoded.success }, "pointer");
    }
  }, [saveId]);
  return decoded._tag === "Malformed" ? (
    <RouteParamErrorScreen reason={decoded.reason} />
  ) : null;
};