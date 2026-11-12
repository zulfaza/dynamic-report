import * as Schema from "effect/Schema"

export class CollectionNotFound extends Schema.TaggedError<CollectionNotFound>()(
  "CollectionNotFound",
  { collectionId: Schema.String }
) {
  override get message(): string {
    return `Collection ${this.collectionId} does not exist.`
  }
}

export class PropertyNotFound extends Schema.TaggedError<PropertyNotFound>()(
  "PropertyNotFound",
  {
    propertyId: Schema.String,
  }
) {
  override get message(): string {
    return `Property ${this.propertyId} does not exist.`
  }
}

export class RowNotFound extends Schema.TaggedError<RowNotFound>()(
  "RowNotFound",
  {
    rowId: Schema.String,
  }
) {
  override get message(): string {
    return `Row ${this.rowId} does not exist.`
  }
}

export class DashboardNotFound extends Schema.TaggedError<DashboardNotFound>()(
  "DashboardNotFound",
  { dashboardId: Schema.String }
) {
  override get message(): string {
    return `Dashboard ${this.dashboardId} does not exist.`
  }
}

export class InvalidCellValue extends Schema.TaggedError<InvalidCellValue>()(
  "InvalidCellValue",
  {
    property: Schema.String,
    expected: Schema.String,
  }
) {
  override get message(): string {
    return `"${this.property}" accepts ${this.expected}.`
  }
}

/** The query refers to a property with the wrong type, for example `sum` on text. */
export class InvalidQuery extends Schema.TaggedError<InvalidQuery>()(
  "InvalidQuery",
  {
    reason: Schema.String,
  }
) {
  override get message(): string {
    return this.reason
  }
}

/** The database failed. The cause is the SQL error. */
export class StorageError extends Schema.TaggedError<StorageError>()(
  "StorageError",
  {
    cause: Schema.Defect(),
  }
) {
  override get message(): string {
    return "The database failed."
  }
}
