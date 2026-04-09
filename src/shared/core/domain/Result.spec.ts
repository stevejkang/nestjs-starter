import { Result } from './Result';

describe('Result', () => {
  it('should return error when access value from error result', () => {
    expect(() => Result.fail('FAIL').value).toThrow(Error);
  });

  it('should return value from ok result', () => {
    expect(Result.ok('OK').value).toEqual('OK');
  });

  it('should return error when result is successful and contains an error', () => {
    expect(() => new Result(true, 'FAIL')).toThrow(Error);
  });

  it('should return error when result is failing and error has not provided', () => {
    expect(() => new Result(false)).toThrow(Error);
  });

  it('should return error value', () => {
    expect(Result.fail('FAIL').errorValue()).toEqual('FAIL');
  });

  it('should return result when combine', () => {
    expect(Result.combine([Result.ok('OK'), Result.fail('FAIL')])).toEqual(
      Result.fail('FAIL'),
    );
    expect(
      Result.combine([Result.ok('OK'), Result.ok('OK')]).isSuccess,
    ).toEqual(true);
  });
});
