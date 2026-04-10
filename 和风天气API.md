## 和风天气 API
Geo Location 返回的数据格式  返回数据是JSON格式并进行了Gzip压缩。
```
{
  "code":"200",
  "location":[
    {
      "name":"北京",
      "id":"101010100",
      "lat":"39.90499",
      "lon":"116.40529",
      "adm2":"北京",
      "adm1":"北京市",
      "country":"中国",
      "tz":"Asia/Shanghai",
      "utcOffset":"+08:00",
      "isDst":"0",
      "type":"city",
      "rank":"10",
      "fxLink":"https://www.qweather.com/weather/beijing-101010100.html"
    }]
}

code 请参考状态码
location.name 地区/城市名称
location.id 地区/城市ID
location.lat 地区/城市纬度
location.lon 地区/城市经度
location.adm2 地区/城市的上级行政区划名称
location.adm1 地区/城市所属一级行政区域
location.country 地区/城市所属国家名称
location.tz 地区/城市所在时区
location.utcOffset 地区/城市目前与UTC时间偏移的小时数，参考详细说明
location.isDst 地区/城市是否当前处于夏令时。1 表示当前处于夏令时，0 表示当前不是夏令时。
location.type 地区/城市的属性
location.rank 地区评分
location.fxLink 该地区的天气预报网页链接，便于嵌入你的网站或应用
refer.sources 原始数据来源，或数据源说明，可能为空
refer.license 数据许可或版权声明，可能为空
```
天气预报返回的数据格式
```
{
  "code": "200",
  "updateTime": "2020-06-30T22:00+08:00",
  "fxLink": "http://hfx.link/2ax1",
  "now": {
    "obsTime": "2020-06-30T21:40+08:00",
    "temp": "24",
    "feelsLike": "26",
    "icon": "101",
    "text": "多云",
    "wind360": "123",
    "windDir": "东南风",
    "windScale": "1",
    "windSpeed": "3",
    "humidity": "72",
    "precip": "0.0",
    "pressure": "1003",
    "vis": "16",
    "cloud": "10",
    "dew": "21"
  },
  "refer": {
    "sources": [
      "QWeather",
      "NMC",
      "ECMWF"
    ],
    "license": [
      "QWeather Developers License"
    ]
  }
}

code 请参考状态码
updateTime 当前API的最近更新时间
fxLink 当前数据的响应式页面，便于嵌入网站或应用
now.obsTime 数据观测时间
now.temp 温度，默认单位：摄氏度
now.feelsLike 体感温度，默认单位：摄氏度
now.icon 天气状况的图标代码，另请参考天气图标项目
now.text 天气状况的文字描述，包括阴晴雨雪等天气状态的描述
now.wind360 风向360角度
now.windDir 风向
now.windScale 风力等级
now.windSpeed 风速，公里/小时
now.humidity 相对湿度，百分比数值
now.precip 过去1小时降水量，默认单位：毫米
now.pressure 大气压强，默认单位：百帕
now.vis 能见度，默认单位：公里
now.cloud 云量，百分比数值。可能为空
now.dew 露点温度。可能为空
refer.sources 原始数据来源，或数据源说明，可能为空
refer.license 数据许可或版权声明，可能为空
```

分钟级降水
```
请求路径  /v7/minutely/5m
查询参数
location(必选)需要查询地区的以英文逗号分隔的经度,纬度坐标（十进制，最多支持小数点后两位）。例如 location=116.41,39.92
lang多语言设置，请阅读多语言文档，了解我们的多语言是如何工作、如何设置以及数据是否支持多语言。
返回数据格式
{
  "code": "200",
  "updateTime": "2021-12-16T18:55+08:00",
  "fxLink": "https://www.qweather.com",
  "summary": "95分钟后雨就停了",
  "minutely": [
    {
      "fxTime": "2021-12-16T18:55+08:00",
      "precip": "0.15",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T19:00+08:00",
      "precip": "0.23",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T19:05+08:00",
      "precip": "0.21",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T19:10+08:00",
      "precip": "0.17",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T19:15+08:00",
      "precip": "0.18",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T19:20+08:00",
      "precip": "0.24",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T19:25+08:00",
      "precip": "0.31",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T19:30+08:00",
      "precip": "0.37",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T19:35+08:00",
      "precip": "0.41",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T19:40+08:00",
      "precip": "0.43",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T19:45+08:00",
      "precip": "0.41",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T19:50+08:00",
      "precip": "0.36",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T19:55+08:00",
      "precip": "0.32",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T20:00+08:00",
      "precip": "0.27",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T20:05+08:00",
      "precip": "0.22",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T20:10+08:00",
      "precip": "0.17",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T20:15+08:00",
      "precip": "0.11",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T20:20+08:00",
      "precip": "0.06",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T20:25+08:00",
      "precip": "0.0",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T20:30+08:00",
      "precip": "0.0",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T20:35+08:00",
      "precip": "0.0",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T20:40+08:00",
      "precip": "0.0",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T20:45+08:00",
      "precip": "0.0",
      "type": "rain"
    },
    {
      "fxTime": "2021-12-16T20:50+08:00",
      "precip": "0.0",
      "type": "rain"
    }
  ],
  "refer": {
    "sources": [
      "QWeather"
    ],
    "license": [
      "QWeather Developers License"
    ]
  }
}
code 请参考状态码
updateTime 当前API的最近更新时间
fxLink 当前数据的响应式页面，便于嵌入网站或应用
summary 分钟降水描述
minutely.fxTime 预报时间
minutely.precip 5分钟累计降水量，单位毫米
minutely.type 降水类型：rain = 雨，snow = 雪
refer.sources 原始数据来源，或数据源说明，可能为空
refer.license 数据许可或版权声明，可能为空
```
天气指数
```
请求路径 /v7/indices/{days}
返回的数据格式：
{
  "code": "200",
  "updateTime": "2021-12-16T18:35+08:00",
  "fxLink": "http://hfx.link/2ax2",
  "daily": [
    {
      "date": "2021-12-16",
      "type": "1",
      "name": "运动指数",
      "level": "3",
      "category": "较不宜",
      "text": "天气较好，但考虑天气寒冷，风力较强，推荐您进行室内运动，若户外运动请注意保暖并做好准备活动。"
    },
    {
      "date": "2021-12-16",
      "type": "2",
      "name": "洗车指数",
      "level": "3",
      "category": "较不宜",
      "text": "较不宜洗车，未来一天无雨，风力较大，如果执意擦洗汽车，要做好蒙上污垢的心理准备。"
    }
  ],
  "refer": {
    "sources": [
      "QWeather"
    ],
    "license": [
      "QWeather Developers License"
    ]
  }
}
code 请参考状态码
updateTime 当前API的最近更新时间
fxLink 当前数据的响应式页面，便于嵌入网站或应用
daily.date 预报日期
daily.type 生活指数类型ID
daily.name 生活指数类型的名称
daily.level 生活指数预报等级
daily.category 生活指数预报级别名称
daily.text 生活指数预报的详细描述，可能为空
refer.sources 原始数据来源，或数据源说明，可能为空
refer.license 数据许可或版权声明，可能为空
```
空气质量
```
实时空气质量API提供指定地点的实时空气质量数据，精度为1x1公里。
基于各个国家或地区当地标准的AQI、AQI等级、颜色和首要污染物
和风天气通用AQI
污染物浓度值、分指数
健康建议
相关联的监测站信息

请求路径 /airquality/v1/current/{latitude}/{longitude}
路径参数: 
      latitude(必选)所需位置的纬度。十进制，最多支持小数点后两位。例如 39.92  
      longitude(必选)所需位置的经度。十进制，最多支持小数点后两位。例如 116.41
返回数据:
{
  "metadata": {
    "tag": "d75a323239766b831889e8020cba5aca9b90fca5080a1175c3487fd8acb06e84"
  },
  "indexes": [
    {
      "code": "us-epa",
      "name": "AQI (US)",
      "aqi": 46,
      "aqiDisplay": "46",
      "level": "1",
      "category": "Good",
      "color": {
        "red": 0,
        "green": 228,
        "blue": 0,
        "alpha": 1
      },
      "primaryPollutant": {
        "code": "pm2p5",
        "name": "PM 2.5",
        "fullName": "Fine particulate matter (<2.5µm)"
      },
      "health": {
        "effect": "No health effects.",
        "advice": {
          "generalPopulation": "Everyone can continue their outdoor activities normally.",
          "sensitivePopulation": "Everyone can continue their outdoor activities normally."
        }
      }
    },
    {
      "code": "qaqi",
      "name": "QAQI",
      "aqi": 0.9,
      "aqiDisplay": "0.9",
      "level": "1",
      "category": "Excellent",
      "color": {
        "red": 80,
        "green": 240,
        "blue": 230,
        "alpha": 1
      },
      "primaryPollutant": {
        "code": "pm2p5",
        "name": "PM 2.5",
        "fullName": "Fine particulate matter (<2.5µm)"
      },
      "health": {
        "effect": "No health implications.",
        "advice": {
          "generalPopulation": "Enjoy your outdoor activities.",
          "sensitivePopulation": "Enjoy your outdoor activities."
        }
      }
    }
  ],
  "pollutants": [
    {
      "code": "pm2p5",
      "name": "PM 2.5",
      "fullName": "Fine particulate matter (<2.5µm)",
      "concentration": {
        "value": 11.0,
        "unit": "μg/m3"
      },
      "subIndexes": [
        {
          "code": "us-epa",
          "aqi": 46,
          "aqiDisplay": "46"
        },
        {
          "code": "qaqi",
          "aqi": 0.9,
          "aqiDisplay": "0.9"
        }
      ]
    },
    {
      "code": "pm10",
      "name": "PM 10",
      "fullName": "Inhalable particulate matter (<10µm)",
      "concentration": {
        "value": 12.0,
        "unit": "μg/m3"
      },
      "subIndexes": [
        {
          "code": "us-epa",
          "aqi": 12,
          "aqiDisplay": "12"
        },
        {
          "code": "qaqi",
          "aqi": 0.5,
          "aqiDisplay": "0.5"
        }
      ]
    },
    {
      "code": "no2",
      "name": "NO2",
      "fullName": "Nitrogen dioxide",
      "concentration": {
        "value": 6.77,
        "unit": "ppb"
      },
      "subIndexes": [
        {
          "code": "us-epa",
          "aqi": 7,
          "aqiDisplay": "7"
        },
        {
          "code": "qaqi",
          "aqi": 0.1,
          "aqiDisplay": "0.1"
        }
      ]
    },
    {
      "code": "o3",
      "name": "O3",
      "fullName": "Ozone",
      "concentration": {
        "value": 0.02,
        "unit": "ppb"
      },
      "subIndexes": [
        {
          "code": "us-epa",
          "aqi": 21,
          "aqiDisplay": "21"
        },
        {
          "code": "qaqi",
          "aqi": 0.2,
          "aqiDisplay": "0.2"
        }
      ]
    },
    {
      "code": "co",
      "name": "CO",
      "fullName": "Carbon monoxide",
      "concentration": {
        "value": 0.25,
        "unit": "ppm"
      },
      "subIndexes": [
        {
          "code": "us-epa",
          "aqi": 3,
          "aqiDisplay": "3"
        },
        {
          "code": "qaqi",
          "aqi": 0.1,
          "aqiDisplay": "0.1"
        }
      ]
    }
  ],
  "stations": [
    {
      "id": "P51762",
      "name": "North Holywood"
    },
    {
      "id": "P58056",
      "name": "Pasadena"
    },
    {
      "id": "P57327",
      "name": "Los Angeles - N. Main Street"
    }
  ]
}
metadata.tag 数据标签
indexes.code 空气质量指数Code
indexes.name 空气质量指数的名字
indexes.aqi 空气质量指数的值
indexes.aqiDisplay 空气质量指数的值的文本显示
indexes.level 空气质量指数等级，可能为空
indexes.category 空气质量指数类别，可能为空
indexes.color.red 空气质量指数的颜色，RGBA中的red
indexes.color.green 空气质量指数的颜色，RGBA中的green
indexes.color.blue 空气质量指数的颜色，RGBA中的blue
indexes.color.alpha 空气质量指数的颜色，RGBA中的alpah
indexes.primaryPollutant.code 首要污染物的Code，可能为空
indexes.primaryPollutant.name 首要污染物的名字，可能为空
indexes.primaryPollutant.fullName 首要污染物的全称，可能为空
indexes.health.effect 空气质量对健康的影响，可能为空
indexes.health.advice.generalPopulation 对一般人群的健康指导意见，可能为空
indexes.health.advice.sensitivePopulation 对敏感人群的健康指导意见，可能为空
pollutants.code 污染物的Code
pollutants.name 污染物的名字
pollutants.fullName 污染物的全称
pollutants.concentration.value 污染物的浓度值
pollutants.concentration.unit 污染物的浓度值的单位
pollutants.subIndexes.code 污染物的分指数的Code，可能为空
pollutants.subIndexes.aqi 污染物的分指数的数值，可能为空
pollutants.subIndexes.aqiDisplay 污染物的分指数数值的显示名称
stations.id AQI相关联的监测站Location ID，可能为空
stations.name AQI相关联的监测站名称
```
天气预警
```
请求路径  /weatheralert/v1/current/{latitude}/{longitude}
路径参数:
      latitude(必选)所需位置的纬度。十进制，最多支持小数点后两位。例如 39.92
      longitude(必选)所需位置的经度。十进制，最多支持小数点后两位。例如 116.41
查询参数:
      localTime是否返回查询地点的本地时间。true 返回本地时间，false 返回UTC时间（默认）。
      lang多语言设置，请阅读多语言文档，了解我们的多语言是如何工作、如何设置以及数据是否支持多语言。
返回的数据格式：
      {
  "metadata": {
    "tag": "ec71f87d59c5db45281fecc9f25d136f638ba414ff0a4c4e97258e6d30218aac",
    "zeroResult": false,
    "attributions": [
      "https://developer.qweather.com/attribution.html",
      "当前预警数据可能存在延迟或信息过时，以官方数据发布为准。"
    ]
  },
  "alerts": [
    {
      "id": "202510241119105837988676",
      "senderName": "临桂区气象台",
      "issuedTime": "2025-10-24T11:19+08:00",
      "messageType": {
        "code": "update",
        "supersedes": [
          "202510181140100706230391"
        ]
      },
      "eventType": {
        "name": "大风",
        "code": "1006"
      },
      "urgency": null,
      "severity": "minor",
      "certainty": null,
      "icon": "1006",
      "color": {
        "code": "blue",
        "red": 30,
        "green": 50,
        "blue": 205,
        "alpha": 1
      },
      "effectiveTime": "2025-10-24T11:19+08:00",
      "onsetTime": "2025-10-24T11:19+08:00",
      "expireTime": "2025-10-25T11:19+08:00",
      "headline": "临桂区气象台更新大风蓝色预警信号",
      "description": "临桂区气象台24日11时19分继续发布大风蓝色预警信号：预计未来24小时内临桂将出现6级（或阵风7级）以上大风，请做好防范。",
      "criteria": "24小时内可能受大风影响，平均风力可达6级以上，或者阵风7级以上；或者已经受大风影响，平均风力为6～7级，或者阵风7～8级并可能持续。",
      "responseTypes": [],
      "instruction": "1. 政府及有关部门按照职责做好防大风工作。\n2. 关好门窗，加固围板、棚架、广告牌等易被风吹动的搭建物，妥善安置易受大风影响的室外物品，遮盖建筑物资。\n3. 相关水域水上作业和过往船舶采取积极的应对措施，如回港避风或者绕道航行等。\n4. 行人注意尽量少骑自行车，刮风时不要在广告牌、临时搭建物等下面逗留。\n5. 有关部门和单位注意森林、草原等防火。"
    }
  ]
}
metadata.tag 数据标签
metadata.zeroResult true 表示请求成功，但无数据返回，例如查询地点无预警
metadata.attributions 数据来源或声明，开发者必须将此内容与当前数据一起展示
alerts.id 本条预警信息的唯一标识
alerts.senderName 预警发布机构的名称，可能为空
alerts.issuedTime 原始预警信息生成的时间，实际发布或接收时间会略有延迟
alerts.messageType.code 预警信息性质的代码，开发者可以了解当前预警是新发布的还是对之前预警的更新。
alerts.messageType.supersedes 当前预警取代或取消后续预警ID的列表，仅在 messageType.code 为 update 或 cancel 时返回。
alerts.eventType.name 预警事件类型的名称
alerts.eventType.code 预警事件类型的代码
alerts.urgency 预警信息的紧迫程度，可能为空
alerts.severity 预警信息的严重程度
alerts.certainty 预警信息的确定性或可信度，可能为空
alerts.icon 预警对应的图标代码
alerts.color.code 预警信息的颜色代码
alerts.color.red 预警信息颜色的红色分量值（RGBA），范围 0–255
alerts.color.green 预警颜色的绿色分量值（RGBA），范围 0–255
alerts.color.blue 预警颜色的蓝色分量值（RGBA），范围 0–255
alerts.color.alpha 预警颜色的透明度分量值（RGBA），范围 0-1
alerts.effectiveTime 预警信息的生效时间，可能为空
alerts.onsetTime 预警事件预计开始的时间，可能为空
alerts.expiredTime 预警信息的失效时间
alerts.headline 预警信息的简要描述或标题
alerts.description 预警信息的详细描述
alerts.criteria 当前预警信息的触发标准或条件。仅供参考，可能滞后于官方标准。可能为空
alerts.instruction 对当前预警的防御指南或行动指导，可能为空
alerts.responseTypes 对当前预警的应对方式的类型代码，可能为空
```
