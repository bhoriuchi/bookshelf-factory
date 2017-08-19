import _ from 'lodash'

export function resolveInput(idList, model) {
  return Promise.resolve(model.results || idList || null)
    .then(results => {
      let res = Array.isArray(results)
        ? _.first(results)
        : results

      return {
        valid: res && res !== -1 && !(res instanceof Error),
        results,
        ids: _(results).castArray()
          .map(v => _.get(v, `["${model.idAttribute}"]`, v))
          .uniq()
          .value()
      }
    })
}