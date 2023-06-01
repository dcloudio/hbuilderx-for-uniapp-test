module.exports = `// uni-app自动化测试教程: uni-app自动化测试教程: https://uniapp.dcloud.net.cn/worktile/auto/hbuilderx-extension/

describe('test title', () => {

    let page;
    beforeAll(async () => {
        page = await program.currentPage();
        await page.waitFor(3000);
    });

    it('check page title', async () => {
        const el = await page.$('.title');
        const titleText = await el.text();
        expect(titleText).toEqual('Hello');
    });
});
`
