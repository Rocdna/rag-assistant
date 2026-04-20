一、通用规范
所有高德 Web 服务 API 遵循以下统一规范：

协议：HTTP/HTTPS 接口

请求方式：GET（绝大多数接口）

返回格式：JSON（默认）或 XML，可通过 output 参数指定

编码：UTF-8

认证：每次请求必须在 URL 参数中携带 key（API Key）

申请 Key：需注册高德开放平台开发者账号，创建应用时选择“Web服务”类型获取 Key。

二、地理/逆地理编码 API
1. 地理编码（地址 → 经纬度）
接口地址：https://restapi.amap.com/v3/geocode/geo

参数	类型	必选	说明
address	String	是	结构化地址（省+市+区县+街道+门牌号）
city	String	否	城市中文/中文全拼/citycode/adcode，限定检索范围
output	String	否	JSON（默认）或 XML
key	String	是	API Key
示例：

text
https://restapi.amap.com/v3/geocode/geo?address=北京市朝阳区阜通东大街6号&key=<用户的key>
2. 逆地理编码（经纬度 → 地址）
接口地址：https://restapi.amap.com/v3/geocode/regeo

参数	类型	必选	说明
location	String	是	经纬度坐标，格式：经度,纬度（最多6位小数）
radius	Number	否	搜索半径，0~3000米
extensions	String	否	base（仅返回地址）或 all（返回地址+周边POI）
key	String	是	API Key
示例：

text
https://restapi.amap.com/v3/geocode/regeo?location=116.310003,39.991957&radius=1000&extensions=all&key=<用户的key>
三、路径规划 API
路径规划 API 提供步行、公交、驾车、骑行等路线规划能力，返回 JSON/XML 格式数据。

1. 驾车路径规划
接口地址：https://restapi.amap.com/v3/direction/driving

参数	必选	说明
origin	是	起点坐标，格式 经度,纬度
destination	是	终点坐标，格式 经度,纬度
strategy	否	路径策略：0=速度优先，1=费用优先，2=距离优先，3=避开高速，4=躲避拥堵等
key	是	API Key
2. 步行路径规划
接口地址：https://restapi.amap.com/v3/direction/walking

参数	必选	说明
origin	是	起点坐标（经度,纬度），支持最大100km步行规划
destination	是	终点坐标（经度,纬度）
key	是	API Key
示例：

text
https://restapi.amap.com/v3/direction/walking?origin=116.434307,39.90909&destination=116.434446,39.90816&key=<用户的key>
3. 骑行路径规划
接口地址：https://restapi.amap.com/v3/direction/bicycling

参数	必选	说明
origin	是	起点坐标
destination	是	终点坐标
key	是	API Key
说明：将 driving 替换为 walking 或 bicycling 即可切换模式。

4. 公交路径规划
接口地址：https://restapi.amap.com/v3/direction/transit/integrated

参数	必选	说明
origin	是	起点坐标
destination	是	终点坐标
city	是	城市名称或 citycode
cityd	否	跨城公交时必填，目标城市
strategy	否	0=最快捷，1=最经济，2=最少换乘，3=最少步行，5=不乘地铁
nightflag	否	是否计算夜班车，0=否，1=是
key	是	API Key
四、搜索 POI API
提供关键字搜索、周边搜索、多边形搜索、ID 查询四种机制。

1. 关键字搜索
接口地址：https://restapi.amap.com/v3/place/text

参数	必选	说明
keywords	是	查询关键词（如“北京大学”）
types	否	POI 类型编码
city	否	城市中文/全拼/citycode/adcode（建议用 adcode 精确到区县）
offset	否	每页记录数，最大 25
page	否	当前页数
extensions	否	base（基本地址）或 all（返回地址+附近POI+道路）
key	是	API Key
示例：

text
https://restapi.amap.com/v3/place/text?keywords=北京大学&city=beijing&offset=20&page=1&extensions=all&key=<用户的key>
2. 周边搜索
接口地址：https://restapi.amap.com/v3/place/around

参数	必选	说明
location	是	中心点坐标
keywords	否	查询关键词
types	否	POI 类型
radius	否	搜索半径（米），默认 3000，最大 50000
key	是	API Key
3. 多边形搜索
接口地址：https://restapi.amap.com/v3/place/polygon

参数	必选	说明
polygon	是	经纬度坐标串，矩形时为左上、右下两顶点
keywords	否	查询关键词
key	是	API Key
五、距离测量 API
说明：距离测量通常通过路径规划接口获取驾车/步行/骑行的实际距离，而非直线距离。

驾车距离：调用 /v3/direction/driving 接口，从返回结果的 paths.distance 字段获取

步行距离：调用 /v3/direction/walking 接口

骑行距离：调用 /v3/direction/bicycling 接口

支持批量请求，建议通过 status 字段判断请求是否成功。


六、输入提示 API
接口地址：https://restapi.amap.com/v3/assistant/inputtips
参数	类型	必选	说明
keywords	String	是	查询关键词
city	String	否	城市中文/全拼/citycode/adcode，限制搜索范围
citylimit	Boolean	否	是否严格限制在城市范围内
key	String	是	API Key
说明：根据用户输入的关键词返回建议列表，可用于搜索框的自动补全。


坐标格式：所有经纬度格式统一为 经度,纬度（经度在前，纬度在后），小数点不超过 6 位

API Key：每个请求必须携带 key 作为 URL 查询参数，不要放在 header 中

调用限制：各接口有调用量限制（QPS 和日配额），可查阅高德开放平台控制台了解具体限额

翻页限制：POI 搜索翻页最多支持获取 200 条数据

编码：所有输入参数和输出数据统一为 UTF-8