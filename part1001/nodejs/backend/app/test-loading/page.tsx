async function getData() {
  // 故意等待 3 秒钟
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return { data: '数据加载成功！' };
}

export default async function TestLoadingPage() {
  const data = await getData();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">加载测试页面</h1>
      <p>{data.data}</p>
    </div>
  );
}
