'use strict';

{
  const { test, assert, assertEqual } = Suite;

  test('zhihuContentCacheKey: normalizes query order', () => {
    assertEqual(
      zhihuContentCacheKey('/api/v1/content/zhihu_search', { Query: 'AI', page: 1 }),
      zhihuContentCacheKey('/api/v1/content/zhihu_search', { page: 1, Query: 'AI' })
    );
  });

  test('normalizeZhihuContentResults: accepts common result shapes', () => {
    const items = normalizeZhihuContentResults({
      data: {
        results: [
          { title: '问题标题', excerpt: '<p>回答摘要</p>', url: 'https://www.zhihu.com/question/1', author_name: '作者' },
        ],
      },
    });
    assertEqual(items.length, 1);
    assertEqual(items[0].title, '问题标题');
    assertEqual(items[0].excerpt, '回答摘要');
    assertEqual(items[0].author, '作者');
  });

  test('normalizeZhihuContentResults: accepts official PascalCase search shape', () => {
    const items = normalizeZhihuContentResults({
      Code: 0,
      Message: 'success',
      Data: {
        HasMore: true,
        Items: [
          { Title: '官方返回标题', ContentText: '<p>官方摘要</p>', Url: 'https://www.zhihu.com/question/2', AuthorName: '知乎作者', ContentType: 'answer' },
        ],
      },
    });
    assertEqual(items.length, 1);
    assertEqual(items[0].title, '官方返回标题');
    assertEqual(items[0].excerpt, '官方摘要');
    assertEqual(items[0].url, 'https://www.zhihu.com/question/2');
    assertEqual(items[0].author, '知乎作者');
    assertEqual(items[0].type, 'answer');
  });

  test('zhihuContentPickArray: falls back to empty array', () => {
    assert(Array.isArray(zhihuContentPickArray({ data: { value: 1 } })), 'should always return an array');
    assertEqual(zhihuContentPickArray({ data: { value: 1 } }).length, 0);
  });
}
