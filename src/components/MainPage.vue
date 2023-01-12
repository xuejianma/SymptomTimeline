<template>
    <v-card height="100%" elevation="2" class="pa-2">
        <v-card-title class="text-center">病程记录助手</v-card-title>
        <v-select v-model="symptoms" :items="allSymptoms" chips label="常见症状添加/删除" multiple></v-select>
        <v-row>
            <v-col cols="6"><v-text-field v-model="startDay" label="开始日期 (YYYY-MM-DD)" @keyup.enter="updateDay"
                    :rules="rulesStartDay"></v-text-field></v-col>
            <v-col cols="6"><v-text-field v-model="endDay" label="结束日期 (YYYY-MM-DD)" @keyup.enter="updateDay"
                    :rules="rulesEndDay"><v-icon @click="updateToday">mdi-refresh</v-icon></v-text-field></v-col>
        </v-row>

        <Gantt ref="gantt" :data="data" itemText="症状" dateText="日期" :dateRangeList="dateRangeList"
            @scheduleClick="scheduleClick" />
        <v-card-actions class="justify-center">
            <v-btn @click="exportImg"><v-icon>mdi-cellphone-screenshot</v-icon>点击完整截图</v-btn>
        </v-card-actions>
        <v-text-field v-model="newSymptom" label="添加/删除任意症状" @keyup.enter="addSymptom"></v-text-field>
        <v-container class="text-center pa-0 ma-0">
            <v-btn @click="addSymptom">添加该症状</v-btn>
            <v-btn @click="deleteSymptom">删除该症状</v-btn>
        </v-container>
        <v-text-field class="pt-6" v-model="recordedId" label="记录ID（云端匿名保存病程，请保管ID）" :rules="rulesRecordedId"
            appendIcon="mdi-content-copy" @click:append="copyRecordedId"></v-text-field>
        <v-container class="text-center pa-0 ma-0">
            <v-btn elevation="1" @click="generateNewIdRecorded" class="mb-3">生成新ID</v-btn>
            <v-btn elevation="1" @click="saveRecorded" class="mb-3" color="red">保存至云端</v-btn>
            <v-btn elevation="1" @click="loadRecorded" class="mb-3">从云端加载</v-btn>
            <v-btn elevation="1" @click="shareRecorded"
                class="mb-3"><v-icon>mdi-share-variant</v-icon>分享/复制快捷链接(含ID)</v-btn>
        </v-container>
        <v-card-actions class="justify-center pt-6">
            <v-btn href="https://github.com/xuejianma/SymptomTimeline" target="_blank">
                <v-icon>mdi-github</v-icon>
            </v-btn>
        </v-card-actions>
    </v-card>
    <v-snackbar v-model="snackbar" :timeout="2000">
        {{ textSnackbar }}
        <template v-slot:actions>
            <v-btn color="pink" variant="text" @click="snackbar = false">
                Close
            </v-btn>
        </template>
    </v-snackbar>
</template>

<script>
import { ref } from 'vue'
import Gantt from 'vue3-gantt'
import 'vue3-gantt/dist/style.css'
import firebase from '../services/firebaseConfig.js'
import { useRoute, useRouter } from 'vue-router'

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ID_LENGTH = 11;
const formatDate = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`
}
const formatDateISO = (date) => {
    return date.toISOString().split('T')[0]
}
var today = new Date()
const firstDay = new Date(today.setDate(today.getDate() - 11))
today = new Date()
const lastDay = today
const dateRange = ref([formatDate(firstDay), formatDate(lastDay)])
const getDateRangeList = () => {
    const firstDay = new Date(dateRange.value[0])
    const lastday = new Date(dateRange.value[1])
    var lastDayInList = new Date(lastday.setDate(lastday.getDate() + 1))
    var firstDayInList = new Date(firstDay)
    const timezone = firstDayInList.getTimezoneOffset()
    if (timezone > 0) {
        firstDayInList = new Date(firstDayInList.setDate(firstDayInList.getDate() + 2))
        lastDayInList = new Date(lastDayInList.setDate(lastDayInList.getDate() + 2))
    }
    return [formatDateISO(firstDayInList), formatDateISO(lastDayInList)]
}
const dateRangeList = ref(getDateRangeList())
const symptomNames = ['发热', '咽痒咳嗽', '咽干咽痛', '乏力', '鼻涕', '鼻塞', '肠胃不适', '头痛', '关节痛', '味觉失灵', '嗅觉失灵', '抗原检测', '核酸检测',]
const allSymptoms = ref([...symptomNames])
const symptoms = ref([...symptomNames])
const severities = {
    nan: {
        color: '#fff',
        color_text: 'gray',
        name: 'nan',
        name_display: '无',
    },
    barely: {
        color: '#ffd',
        color_text: 'gray',
        name: 'barely',
        name_display: '微弱',
    },
    weak: {
        color: '#fdd',
        color_text: 'gray',
        name: 'weak',
        name_display: '轻度',
    },
    medium: {
        color: '#f99',
        color_text: '#fff',
        name: 'medium',
        name_display: '中度',
    },
    strong: {
        color: '#f22',
        color_text: '#fff',
        name: 'strong',
        name_display: '重度',
    },
}
const meaningfulData = {
    data: {},
    dateRange: dateRange.value,
    createtime: new Date().toISOString(),
    allSymptoms: allSymptoms.value,
    symptoms: symptoms.value,
}
const gantt = ref(null)
const exportImg = () => {
    gantt.value.exportImg({ download: true })
}

export default {
    name: 'MainPage',
    components: {
        Gantt
    },

    setup() {
        const router = useRouter()
        const route = useRoute()
        return {
            gantt,
            route,
            router,
        }
    },

    created() {
        window.addEventListener(
            "beforeunload",
            () => {
                if (this.recordedId) {
                    this.saveRecorded()
                }
            },
        );
    },

    mounted() {
        this.router.isReady().then(() => {
            this.recordedId = this.route.query.id
            if (this.recordedId) {
                this.loadRecorded()
            }
        })
    },

    // beforeRouteLeave(to, from, next) {
    //     if (this.recordedId) {
    //         this.saveRecorded()
    //     }
    //     next()
    // },


    data() {
        const start = new Date(dateRange.value[0])
        const end = new Date(dateRange.value[1])
        return {
            snackbar: false,
            textSnackbar: '',
            dateRange,
            dateRangeList,
            symptoms,
            allSymptoms,
            exportImg,
            recordedId: '',
            data: this.createData(),
            newSymptom: '',
            startDay: formatDateISO(start),
            endDay: formatDateISO(end),
            rulesStartDay: [
                v => !!v || '开始日期不能为空',
                v => v.length === 10 || '开始日期格式不正确',
                v => v.split('-')[0].length === 4 || '开始日期格式不正确',
                v => v.split('-')[1].length === 2 || '开始日期格式不正确',
                v => v.split('-')[2].length === 2 || '开始日期格式不正确',
                v => new Date(v) <= new Date(this.endDay) || '开始日期不能晚于结束日期',
                v => v <= formatDate(new Date()) || '开始日期不能晚于今天',
            ],
            rulesEndDay: [
                v => !!v || '结束日期不能为空',
                v => v.length === 10 || '结束日期格式不正确',
                v => v.split('-')[0].length === 4 || '结束日期格式不正确',
                v => v.split('-')[1].length === 2 || '结束日期格式不正确',
                v => v.split('-')[2].length === 2 || '结束日期格式不正确',
                v => new Date(v) >= new Date(this.startDay) || '结束日期不能早于开始日期',
                v => v <= formatDate(new Date()) || '结束日期不能晚于今天',
            ],
            rulesRecordedId: [
                v => !!v || 'ID不能为空，请输入ID或点击“新ID”',
                v => v.length === ID_LENGTH || 'ID格式错误',
            ],
        }
    },

    watch: {
        symptoms: function () {
            this.data = this.createData()
        },
    },

    methods: {
        deleteSymptom() {
            if (this.newSymptom === '') {
                this.textSnackbar = '症状不能为空'
                this.snackbar = true
                return
            }
            if (!this.allSymptoms.includes(this.newSymptom)) {
                this.textSnackbar = '该症状不存在'
                this.snackbar = true
                return
            }
            this.allSymptoms = this.allSymptoms.filter(symptom => symptom !== this.newSymptom)
            symptoms.value = symptoms.value.filter(symptom => symptom !== this.newSymptom)
            this.data = this.createData()
            this.textSnackbar = '已删除该症状'
            this.snackbar = true
        },
        addSymptom() {
            if (this.allSymptoms.includes(this.newSymptom)) {
                this.textSnackbar = '该症状已存在'
                this.snackbar = true
                return
            }
            if (this.newSymptom === '') {
                this.textSnackbar = '症状不能为空'
                this.snackbar = true
                return
            }
            this.allSymptoms.push(this.newSymptom)
            this.symptoms.push(this.newSymptom)
            this.data = this.createData()
            this.textSnackbar = '已添加该症状'
            this.snackbar = true
        },
        updateDay() {
            var v = this.startDay
            if (!(!!v && v.length === 10 && v.split('-')[0].length === 4 && v.split('-')[1].length === 2 && v.split('-')[2].length === 2 && new Date(v) <= new Date(this.endDay) && v <= formatDate(new Date()))) {
                console.log('开始日期不合法')
                return
            }
            v = this.endDay
            if (!(!!v && v.length === 10 && v.split('-')[0].length === 4 && v.split('-')[1].length === 2 && v.split('-')[2].length === 2 && new Date(v) >= new Date(this.startDay) && v <= formatDate(new Date()))) {
                console.log('结束日期不合法')
                return
            }
            const start = new Date(this.startDay)
            const end = new Date(this.endDay)
            dateRange.value[0] = formatDateISO(start)
            dateRange.value[1] = formatDateISO(end)
            dateRangeList.value = getDateRangeList()
            this.data = this.createData()
        },
        updateToday() {
            this.endDay = formatDate(new Date())
            this.updateDay()
        },
        createData() {
            const newData = []
            const days = []
            const start = new Date(dateRangeList.value[0])
            const end = new Date(dateRangeList.value[1])
            const timezone = new Date().getTimezoneOffset()
            if (timezone > 0) {
                start.setDate(start.getDate() - 2)
                end.setDate(end.getDate() - 2)
            }
            for (let d = start; d < end; d.setDate(d.getDate() + 1)) {
                days.push(formatDateISO(new Date(d)))
            }
            symptoms.value.forEach(name => {
                newData.push({
                    type: 'normal',
                    color: '',
                    name: name,
                    schedule: days.map(date => {
                        if (meaningfulData.data[name] && meaningfulData.data[name][date]) {
                            const severity = meaningfulData.data[name][date]
                            const color = severities[severity].color
                            const color_text = severities[severity].color_text
                            return {
                                id: this.uuid(),
                                name: severities[severity].name_display,
                                desc: '',
                                backgroundColor: color,
                                textColor: color_text,
                                days: [date,],
                            }
                        }
                        return {
                            id: this.uuid(),
                            name: severities.nan.name_display,
                            desc: '',
                            backgroundColor: severities.nan.color,
                            textColor: severities.nan.color_text,
                            days: [date,],
                        }
                    })
                })
            })
            return newData
        },
        scheduleClick(schedule) {
            if (schedule.type === 'normal') {
                return
            }
            const index_data = this.data.findIndex(item => item.schedule.findIndex(item => item.id === schedule.id) !== -1)
            const index_schedule = this.data[index_data].schedule.findIndex(item => item.id === schedule.id)
            schedule = this.data[index_data].schedule[index_schedule]
            if (schedule.name === severities.nan.name_display) {
                schedule.name = severities.barely.name_display
                schedule.backgroundColor = severities.barely.color
                schedule.textColor = severities.barely.color_text
                if (!meaningfulData.data[this.data[index_data].name]) {
                    meaningfulData.data[this.data[index_data].name] = {}
                }
                meaningfulData.data[this.data[index_data].name][schedule.days[0]] = Object.keys(severities).find(key => severities[key].name_display === schedule.name)
            }
            else if (schedule.name === severities.barely.name_display) {
                schedule.name = severities.weak.name_display
                schedule.backgroundColor = severities.weak.color
                schedule.textColor = severities.weak.color_text
                if (!meaningfulData.data[this.data[index_data].name]) {
                    meaningfulData.data[this.data[index_data].name] = {}
                }
                meaningfulData.data[this.data[index_data].name][schedule.days[0]] = Object.keys(severities).find(key => severities[key].name_display === schedule.name)
            }
            else if (schedule.name === severities.weak.name_display) {
                schedule.name = severities.medium.name_display
                schedule.backgroundColor = severities.medium.color
                schedule.textColor = severities.medium.color_text
                if (!meaningfulData.data[this.data[index_data].name]) {
                    meaningfulData.data[this.data[index_data].name] = {}
                }
                meaningfulData.data[this.data[index_data].name][schedule.days[0]] = Object.keys(severities).find(key => severities[key].name_display === schedule.name)
            } else if (schedule.name === severities.medium.name_display) {
                schedule.name = severities.strong.name_display
                schedule.backgroundColor = severities.strong.color
                schedule.textColor = severities.strong.color_text
                if (!meaningfulData.data[this.data[index_data].name]) {
                    meaningfulData.data[this.data[index_data].name] = {}
                }
                meaningfulData.data[this.data[index_data].name][schedule.days[0]] = Object.keys(severities).find(key => severities[key].name_display === schedule.name)
            } else if (schedule.name === severities.strong.name_display) {
                schedule.name = severities.nan.name_display
                schedule.backgroundColor = severities.nan.color
                schedule.textColor = severities.nan.color_text
                delete meaningfulData.data[this.data[index_data].name][schedule.days[0]]
                if (Object.keys(meaningfulData.data[this.data[index_data].name]).length === 0 && meaningfulData.data[this.data[index_data].name].constructor === Object) {
                    delete meaningfulData.data[this.data[index_data].name]
                }
            }
        },
        uuid() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = (Math.random() * 16) | 0,
                    v = c == 'x' ? r : (r & 0x3) | 0x8
                return v.toString(16)
            })
        },
        caseId() {
            var rtn = '';
            for (var i = 0; i < ID_LENGTH; i++) {
                rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
            }
            return rtn;
        },
        generateNewIdRecorded() {
            this.recordedId = this.caseId()
        },
        saveRecorded() {
            if (!this.recordedId || this.recordedId === '') {
                this.generateNewIdRecorded()
            }
            if (this.recordedId.length !== ID_LENGTH) {
                console.log('invalid id.')
                this.textSnackbar = '请输入有效ID或点击“新ID”'
                this.snackbar = true
                return
            }
            if (Object.keys(meaningfulData.data).length === 0) {
                console.log('no data.')
                this.textSnackbar = '请先填写数据'
                this.snackbar = true
                return
            }
            meaningfulData.dateRange = this.dateRange
            meaningfulData.allSymptoms = this.allSymptoms
            meaningfulData.symptoms = this.symptoms
            firebase.saveData(this.recordedId, meaningfulData).then(() => {
                try {
                    navigator.clipboard.writeText(this.recordedId)
                } catch (err) {
                    console.log(err)
                }
                this.textSnackbar = '保存成功，ID已复制到剪贴板'
                this.snackbar = true
                this.router.replace({ path: this.route.path, query: { id: this.recordedId } })
                history.pushState(null, null, this.route.path + '?id=' + this.recordedId)
            }).catch(err => {
                console.log(err)
                this.textSnackbar = '保存失败，请重试'
                this.snackbar = true
            })
        },
        loadRecorded() {
            if (!this.recordedId || this.recordedId === '' || this.recordedId.length !== ID_LENGTH) {
                console.log('invalid id.')
                this.textSnackbar = '请输入有效ID'
                this.snackbar = true
                return
            }
            firebase.getData(this.recordedId).then(data => {
                meaningfulData.data = data.data
                meaningfulData.dateRange = data.dateRange
                meaningfulData.allSymptoms = data.allSymptoms
                meaningfulData.symptoms = data.symptoms
                this.dateRange = meaningfulData.dateRange
                this.startDay = this.dateRange[0]
                this.endDay = this.dateRange[1]
                dateRangeList.value = getDateRangeList()
                this.allSymptoms = meaningfulData.allSymptoms
                this.symptoms = meaningfulData.symptoms
                this.data = this.createData()
                this.textSnackbar = '加载成功'
                this.snackbar = true
                this.router.replace({ path: this.route.path, query: { id: this.recordedId } })
                history.pushState(null, null, this.route.path + '?id=' + this.recordedId)
            }).catch(err => {
                console.log(err)
                this.textSnackbar = '加载失败，请输入保存过的ID'
                this.snackbar = true
            })
        },
        shareRecorded() {
            navigator.share({
                title: 'Share recorded data',
                text: 'Share recorded data',
                url: window.location.href.split('?')[0] + (this.recordedId ? '?id=' + this.recordedId : ''),
            })
        },
        copyRecordedId() {
            try {
                navigator.clipboard.writeText(this.recordedId)
            } catch (err) {
                console.log(err)
            }
            this.textSnackbar = (this.recordedId ? this.recordedId : '') + ' 已复制至剪贴板'
            this.snackbar = true
        },
    },
}
</script>