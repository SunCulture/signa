import {
  createSearchParamsCache,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server"

export const paginationParsers = {
  limit: parseAsInteger.withDefault(10),
  after: parseAsString,
  before: parseAsString,
}

export const submissionsSearchParsers = {
  ...paginationParsers,
  q: parseAsString.withDefault(""),
  archived: parseAsBoolean.withDefault(false),
  status: parseAsStringEnum(["pending", "completed", "declined", "expired"]),
  template_id: parseAsString,
}

export const templatesSearchParsers = {
  ...paginationParsers,
  q: parseAsString.withDefault(""),
  archived: parseAsBoolean.withDefault(false),
  folder: parseAsString,
}

export const submittersSearchParsers = {
  ...paginationParsers,
  q: parseAsString.withDefault(""),
  submission_id: parseAsString,
  template_id: parseAsString,
}

export const submissionsSearchParamsCache = createSearchParamsCache(
  submissionsSearchParsers,
)

export const templatesSearchParamsCache =
  createSearchParamsCache(templatesSearchParsers)

export const submittersSearchParamsCache = createSearchParamsCache(
  submittersSearchParsers,
)
