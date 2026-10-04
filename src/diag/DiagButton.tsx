import OBR from "@owlbear-rodeo/sdk";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import BugReportIcon from "@mui/icons-material/BugReportRounded";

import { getPluginId } from "../plugin/getPluginId";

/** TEMPORARY diagnostics (docs/TASKS.md, stage 1) */
export function DiagButton() {
  function handleClick() {
    OBR.modal.open({
      id: getPluginId("diag/modal"),
      url: `${import.meta.env.BASE_URL}diag.html`,
      width: 760,
      height: 640,
    });
  }

  return (
    <Tooltip title="Диагностика" placement="top" disableInteractive>
      <IconButton onClick={handleClick}>
        <BugReportIcon />
      </IconButton>
    </Tooltip>
  );
}
