'use client';

import { useEffect } from 'react';

export default function ErrorTest() {
  useEffect(() => {
    // 故意抛出一个错误来测试错误页面
    throw new Error('这是一个测试错误！');
  }, []);
  
  // 这部分代码永远不会执行，因为组件会在渲染过程中抛出错误
  return (
    <div>
      <h1>错误测试页面</h1>
      <p>这个页面会故意抛出错误</p>
    </div>
  );
}
