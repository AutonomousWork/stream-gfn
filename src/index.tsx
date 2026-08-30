import { definePlugin } from "@decky/api";
import { PanelSection, PanelSectionRow, staticClasses } from "@decky/ui";
import { FaCloud } from "react-icons/fa";

const PLUGIN_NAME = "Stream GFN";

export default definePlugin(() => ({
  name: PLUGIN_NAME,
  titleView: <div className={staticClasses.Title}>{PLUGIN_NAME}</div>,
  content: (
    <PanelSection title={PLUGIN_NAME}>
      <PanelSectionRow>Expedition 33 device proof</PanelSectionRow>
    </PanelSection>
  ),
  icon: <FaCloud />,
  onDismount() {},
}));
