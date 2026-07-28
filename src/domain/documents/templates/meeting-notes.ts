import {
  badge,
  bullets,
  callout,
  cover,
  doc,
  h,
  numbered,
  p,
  table,
} from "./blocks";
import type { Template } from "./template";

export const meetingNotesTemplate: Template = {
  id: "meeting-notes",
  label: "Meeting notes",
  description: "Attendees, agenda, decisions and action items with owners.",
  preset: "editorial",
  thumb: ["title", "text", "callout", "table"],
  content: doc(
    cover(
      "Meeting notes",
      "What we discussed, decided and who does what next.",
      "Facilitator · Date · 30 min",
    ),
    h(2, "Attendees"),
    p("Name — role · Name — role · Name — role"),
    h(2, "Agenda"),
    numbered(
      "Topic one — context and question to settle",
      "Topic two — options on the table",
      "Topic three — anything blocking the team",
    ),
    h(2, "Decisions"),
    callout(
      "note",
      p("Decision: state what was agreed, in one sentence, so nobody has to reread the notes."),
    ),
    p("Rationale: the reason the group landed there, and the option it beat."),
    h(2, "Action items"),
    table(
      ["Action", "Owner", "Due", "Status"],
      ["Write up the decision and share it", "Name", "This week", badge("In progress", "blue")],
      ["Prepare the follow-up analysis", "Name", "Next week", badge("Not started", "gray")],
      [
        "Unblock the dependency with the platform team",
        "Name",
        "Friday",
        badge("At risk", "yellow"),
      ],
    ),
    h(2, "Parked for later"),
    bullets(
      "Question raised but out of scope for this meeting",
      "Topic that needs an owner before it can be discussed",
    ),
  ),
};
