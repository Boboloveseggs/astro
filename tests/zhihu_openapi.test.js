'use strict';

{
  const { test, assert, assertEqual } = Suite;

  test('zhihuBuildSignString: matches documented format', () => {
    assertEqual(
      zhihuBuildSignString('user-token', '1760000000', 'log_1', ''),
      'app_key:user-token|ts:1760000000|logid:log_1|extra_info:'
    );
  });

  test('getZhihuOpenApiConfig: disabled defaults are ignored', () => {
    const old = globalThis.ZHIHU_OPENAPI_DEFAULTS;
    globalThis.ZHIHU_OPENAPI_DEFAULTS = { enabled: false, appKey: 'a', appSecret: 'b' };
    try {
      assertEqual(getZhihuOpenApiConfig(), null);
      assert(!zhihuOpenApiReady(), 'disabled config should not be ready');
    } finally {
      globalThis.ZHIHU_OPENAPI_DEFAULTS = old;
    }
  });

  test('zhihuStoryToArticle: converts story detail into analyzable article', () => {
    const article = zhihuStoryToArticle(
      { work_id: '123', title: 'Story', labels: ['Suspense'] },
      { work_id: '123', chapter_name: 'Chapter 1', author_name: 'Author', introduction: 'Intro', content: 'Body text' }
    );
    assertEqual(article.type, 'zhihu_story');
    assertEqual(article.title, 'Story - Chapter 1');
    assert(article.body.includes('Body text'), 'body text should be included');
    assert(article.body.includes('Suspense'), 'labels should be included');
  });
}
