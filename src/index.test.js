import 'isomorphic-fetch'
import nock from 'nock'
import fetchPaginate from '.'

const base = 'http://api.example.com'
const url = `${base}/foo`

nock(base)
  .get('/one')
  .reply(200, '"one"')
  .get('/foo')
  .times(Infinity)
  .reply(200, '["one"]', {
    Link:
      '<http://api.example.com/foo?page=2>; rel="next", ' +
      '<http://api.example.com/foo?page=3>; rel="last"'
  })
  .get('/foo')
  .times(Infinity)
  .query({ page: '2' })
  .reply(200, '["two"]', {
    Link:
      '<http://api.example.com/foo?page=3>; rel="next", ' +
      '<http://api.example.com/foo?page=3>; rel="last"'
  })
  .get('/foo')
  .times(Infinity)
  .query({ page: '3' })
  .reply(200, '["three"]', {
    Link: '<http://api.example.com/foo?page=3>; rel="last"'
  })

describe('index', () => {
  it('should handle non-paginated requests', () => {
    return fetchPaginate('http://api.example.com/one').then(({ data }) => {
      expect(data).toEqual('one')
    })
  })

  it('should paginate', () => {
    return fetchPaginate(url).then(({ data }) => {
      expect(data).toEqual(['one', 'two', 'three'])
    })
  })

  it('should paginate until told not to', () => {
    const until = (page, data, res) => data && data.length === 2
    return fetchPaginate(url, { until }).then(({ data }) => {
      expect(data).toEqual(['one', 'two'])
    })
  })

  it('should paginate until promise told not to', () => {
    const until = (page, data, res) =>
      new Promise(resolve => {
        setTimeout(() => resolve(data && data.length === 2), 100)
      })
    return fetchPaginate(url, { until }).then(({ data }) => {
      expect(data).toEqual(['one', 'two'])
    })
  })

  it('should paginate until async told not to', () => {
    const until = async (page, data, res) => data && data.length === 2
    return fetchPaginate(url, { until }).then(({ data }) => {
      expect(data).toEqual(['one', 'two'])
    })
  })

  it('should not paginate if told not to', () => {
    return fetchPaginate(url, { paginate: false }).then(({ data }) => {
      expect(data).toEqual(['one'])
    })
  })
})
