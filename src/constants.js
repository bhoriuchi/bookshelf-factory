export const HAS_ONE = 'hasOne'
export const HAS_MANY = 'hasMany'
export const BELONGS_TO = 'belongsTo'
export const BELONGS_TO_MANY = 'belongsToMany'
export const MORPH_TO = 'morphTo'
export const MORPH_ONE = 'morphOne'
export const MORPH_MANY = 'morphMany'
export const CONNECT_RELATION = 'connectRelation'
export const VIRTUALS = 'virtuals'
export const FETCH_OPTS = 'fetchOpts'
export const JSON_OPTS = 'jsonOpts'

export const RELATIONS = [
  HAS_ONE,
  HAS_MANY,
  BELONGS_TO,
  BELONGS_TO_MANY,
  MORPH_TO,
  MORPH_ONE,
  MORPH_MANY
]

export const EXTENDS = [
  'extendProto',
  'extendClass'
]