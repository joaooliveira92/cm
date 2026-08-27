import { Schema } from "effect";

export class SaveSummary extends Schema.Class<SaveSummary>("SaveSummary")({
  id: Schema.String,
  name: Schema.String,
  createdAt: Schema.String,
}) {}

export class SaveNotFoundError extends Schema.TaggedError<SaveNotFoundError>()(
  "SaveNotFoundError",
  {
    id: Schema.String,
  },
) {}
