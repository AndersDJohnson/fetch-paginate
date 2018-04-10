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
    Link: '<http://api.example.com/foo?page=2>; rel="next", ' +
      '<http://api.example.com/foo?page=3>; rel="last"'
  })
  .get('/foo')
  .query({ page: '2' })
  .reply(200, '["two"]', {
    Link: '<http://api.example.com/foo?page=3>; rel="next", ' +
      '<http://api.example.com/foo?page=3>; rel="last"'
  })
  .get('/foo')
  .query({ page: '3' })
  .reply(200, '["three"]', {
    Link: '<http://api.example.com/foo?page=3>; rel="last"'
  })

describe('index', () => {
  it('should handle non-paginated requests', () => {
    return fetchPaginate('http://api.example.com/one')
    .then(({ data }) => {
        expect(data).toEqual('one')
      })
  })

  it('should paginate', () => {
    return fetchPaginate(url)
    .then(({ data }) => {
        expect(data).toEqual(['one', 'two', 'three'])
      })
  })

  it('should not paginate if told not to', () => {
    return fetchPaginate(url, { paginate: false })
      .then(({ data }) => {
        expect(data).toEqual(['one'])
      })
  })
})
