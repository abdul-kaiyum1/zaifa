var _0x3d6c = [
    'threadID',
    'hVJWK',
    'NzcyK',
    'VWnQt',
    'DMtLy',
    'UBgcN',
    'qWsqH',
    'UNITS',
    'Mbps',
    'getSpeed',
    '\x0a🟢\x20Bot\x20Has\x20Been\x20Working\x20For\x0a-\x20',
    '\x20Hr(s)\x20',
    '\x20Min(s)\x20',
    '\x20sec(s)\x0a-\x20Total\x20Users:\x20',
    '\x0a-\x20Total\x20Threads:\x20',
    '\x0a-\x20Speed:\x20',
    'ms\x0a-\x20Speed\x20Status:\x20',
    '\x0a-\x20Media\x20Banned:\x20𝗖𝗵𝗲𝗰𝗸𝗶𝗻𝗴...\x0a-\x20Checking\x20Internet\x20Speed...\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20',
    'editMessage',
    'messageID',
    'rSakn',
    'HeQMx',
    'vWhNc',
    '\x0a-\x20Media\x20Banned:\x20',
    '\x0a-\x20',
    '\x20ᴍʙᴘꜱ\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20',
    'error',
    'ebGRA',
    'replace',
    'end',
    'GET',
    'stream',
    'lvnlZ',
    'WLiOa',
    'PeBPC',
    'data',
    'pipe',
    'createWriteStream',
    'iAzzt',
    'DRzSY',
    'createReadStream',
    'path',
    'moment-timezone',
    'fast-speedtest-api',
    'axios',
    'https://i.ibb.co/XX9752N/image.jpg',
    '7388254684526242',
    'resolve',
    'downloaded_image.jpg',
    'exports',
    'uptime',
    'upt',
    '3.0',
    'Sahadat\x20Hossen',
    'Check\x20bot\x27s\x20uptime,\x20bot\x27s\x20speed\x20and\x20check\x20Media\x20ban\x20status',
    'Check\x20the\x20bot\x27s\x20uptime,\x20users,\x20threads,\x20bot\x27s\x20speed\x20performance\x20and\x20check\x20bot\x27s\x20media\x20ban\x20status',
    'system',
    '{pn}',
    'NO\x20✅',
    'YES\x20🚫',
    'seconds',
    '🟢\x20Processing...',
    'Bad\x20❎',
    'Medium❗',
    'Good\x20✅',
    'YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm',
    '❌\x20An\x20error\x20occurred\x20while\x20fetching\x20system\x20statistics.',
    'JVxXf',
    'getAll',
    'duration',
    'DkWJx',
    'floor',
    'asHours',
    'minutes',
    'length',
    'now',
    'sendMessage',
    'thin',
    'lDNBE'
];
(function (_0x2b475f, _0x7e0acf) {
    var _0x15be2a = function (_0x1b78c7) {
        while (--_0x1b78c7) {
            _0x2b475f['push'](_0x2b475f['shift']());
        }
    };
    _0x15be2a(++_0x7e0acf);
}(_0x3d6c, 0x1b4));
var _0xcfb7 = function (_0x1716b2, _0x2a8ed1) {
    _0x1716b2 = _0x1716b2 - 0x0;
    var _0x3aede9 = _0x3d6c[_0x1716b2];
    return _0x3aede9;
};
const fs = require('fs');
const path = require(_0xcfb7('0x0'));
const moment = require(_0xcfb7('0x1'));
const fast = require(_0xcfb7('0x2'));
const axios = require(_0xcfb7('0x3'));
const imageUrl = _0xcfb7('0x4');
const groupId = _0xcfb7('0x5');
const imagePath = path[_0xcfb7('0x6')](__dirname, _0xcfb7('0x7'));
module[_0xcfb7('0x8')] = {
    'config': {
        'name': _0xcfb7('0x9'),
        'aliases': [
            'up',
            _0xcfb7('0xa')
        ],
        'version': _0xcfb7('0xb'),
        'author': _0xcfb7('0xc'),
        'role': 0x1,
        'shortDescription': { 'en': _0xcfb7('0xd') },
        'longDescription': { 'en': _0xcfb7('0xe') },
        'category': _0xcfb7('0xf'),
        'guide': { 'en': _0xcfb7('0x10') }
    },
    'onStart': async function ({api, event, usersData, threadsData}) {
        var _0x56f27b = {
            'rSakn': function (_0x32af0e, _0x990149) {
                return _0x32af0e(_0x990149);
            },
            'HeQMx': _0xcfb7('0x11'),
            'vWhNc': _0xcfb7('0x12'),
            'JVxXf': function (_0x46fe03, _0x21e0d7, _0x48c6d1) {
                return _0x46fe03(_0x21e0d7, _0x48c6d1);
            },
            'DkWJx': _0xcfb7('0x13'),
            'lDNBE': _0xcfb7('0x14'),
            'hVJWK': function (_0x56209d, _0x3d7d1a) {
                return _0x56209d - _0x3d7d1a;
            },
            'NzcyK': function (_0xde7373, _0x3fb7a2) {
                return _0xde7373 > _0x3fb7a2;
            },
            'VWnQt': _0xcfb7('0x15'),
            'DMtLy': _0xcfb7('0x16'),
            'UBgcN': _0xcfb7('0x17'),
            'qWsqH': _0xcfb7('0x18'),
            'ebGRA': _0xcfb7('0x19')
        };
        try {
            await _0x56f27b[_0xcfb7('0x1a')](downloadImage, imageUrl, imagePath);
            const _0x40516b = await usersData[_0xcfb7('0x1b')]();
            const _0x2826f5 = await threadsData[_0xcfb7('0x1b')]();
            const _0x332ab5 = process[_0xcfb7('0x9')]();
            const _0x107c12 = moment[_0xcfb7('0x1c')](_0x332ab5, _0x56f27b[_0xcfb7('0x1d')]);
            const _0x4c5321 = Math[_0xcfb7('0x1e')](_0x107c12[_0xcfb7('0x1f')]());
            const _0x251e91 = _0x107c12[_0xcfb7('0x20')]();
            const _0x2fac7e = _0x107c12[_0xcfb7('0x13')]();
            const _0x5dc434 = _0x40516b[_0xcfb7('0x21')];
            const _0x291b10 = _0x2826f5[_0xcfb7('0x21')];
            const _0x4b27fc = Date[_0xcfb7('0x22')]();
            const _0x35d698 = await api[_0xcfb7('0x23')](this[_0xcfb7('0x24')](_0x56f27b[_0xcfb7('0x25')]), event[_0xcfb7('0x26')]);
            const _0x432759 = _0x56f27b[_0xcfb7('0x27')](Date[_0xcfb7('0x22')](), _0x4b27fc);
            const _0xfd87ed = _0x56f27b[_0xcfb7('0x28')](_0x432759, 0x3e8) ? _0x56f27b[_0xcfb7('0x29')] : _0x56f27b[_0xcfb7('0x28')](_0x432759, 0x1f4) ? _0x56f27b[_0xcfb7('0x2a')] : _0x56f27b[_0xcfb7('0x2b')];
            const _0x1d8580 = new fast({
                'token': _0x56f27b[_0xcfb7('0x2c')],
                'verbose': ![],
                'timeout': 0x2710,
                'https': !![],
                'urlCount': 0x5,
                'bufferSize': 0x8,
                'unit': fast[_0xcfb7('0x2d')][_0xcfb7('0x2e')]
            });
            const _0x3b7e94 = await _0x1d8580[_0xcfb7('0x2f')]();
            const _0x119b4a = _0xcfb7('0x30') + _0x4c5321 + _0xcfb7('0x31') + _0x251e91 + _0xcfb7('0x32') + _0x2fac7e + _0xcfb7('0x33') + _0x5dc434 + _0xcfb7('0x34') + _0x291b10 + _0xcfb7('0x35') + _0x432759 + _0xcfb7('0x36') + _0xfd87ed + _0xcfb7('0x37');
            await api[_0xcfb7('0x38')](this[_0xcfb7('0x24')](_0x119b4a), _0x35d698[_0xcfb7('0x39')]);
            _0x56f27b[_0xcfb7('0x1a')](setTimeout, async () => {
                const _0x3c0a0f = await _0x56f27b[_0xcfb7('0x3a')](sendImage, api);
                const _0x509f35 = _0x3c0a0f ? _0x56f27b[_0xcfb7('0x3b')] : _0x56f27b[_0xcfb7('0x3c')];
                const _0x5ab834 = _0xcfb7('0x30') + _0x4c5321 + _0xcfb7('0x31') + _0x251e91 + _0xcfb7('0x32') + _0x2fac7e + _0xcfb7('0x33') + _0x5dc434 + _0xcfb7('0x34') + _0x291b10 + _0xcfb7('0x35') + _0x432759 + _0xcfb7('0x36') + _0xfd87ed + _0xcfb7('0x3d') + _0x509f35 + _0xcfb7('0x3e') + _0x3b7e94 + _0xcfb7('0x3f');
                await api[_0xcfb7('0x38')](this[_0xcfb7('0x24')](_0x5ab834), _0x35d698[_0xcfb7('0x39')]);
            }, 0xbb8);
        } catch (_0x2f2cc9) {
            console[_0xcfb7('0x40')](_0x2f2cc9);
            return api[_0xcfb7('0x38')](_0x56f27b[_0xcfb7('0x41')], sentMessage[_0xcfb7('0x39')]);
        }
    },
    'thin': _0x4f0694 => _0x4f0694[_0xcfb7('0x42')](/(?!^)(?=(?:\S{3})+$)/g, '')
};
async function downloadImage(_0x18ac4b, _0x10fcd5) {
    var _0x2c6541 = {
        'iAzzt': _0xcfb7('0x43'),
        'DRzSY': _0xcfb7('0x40'),
        'lvnlZ': function (_0x2263df, _0x5563bb) {
            return _0x2263df(_0x5563bb);
        },
        'WLiOa': _0xcfb7('0x44'),
        'PeBPC': _0xcfb7('0x45')
    };
    const _0x5d1702 = await _0x2c6541[_0xcfb7('0x46')](axios, {
        'url': _0x18ac4b,
        'method': _0x2c6541[_0xcfb7('0x47')],
        'responseType': _0x2c6541[_0xcfb7('0x48')]
    });
    _0x5d1702[_0xcfb7('0x49')][_0xcfb7('0x4a')](fs[_0xcfb7('0x4b')](_0x10fcd5));
    return new Promise((_0x53c6cf, _0x1e45b0) => {
        _0x5d1702[_0xcfb7('0x49')]['on'](_0x2c6541[_0xcfb7('0x4c')], _0x53c6cf);
        _0x5d1702[_0xcfb7('0x49')]['on'](_0x2c6541[_0xcfb7('0x4d')], _0x1e45b0);
    });
}
async function sendImage(_0x50e41f) {
    try {
        const _0x479a0c = fs[_0xcfb7('0x4e')](imagePath);
        await _0x50e41f[_0xcfb7('0x23')]({ 'attachment': _0x479a0c }, groupId);
        return !![];
    } catch (_0x1525ab) {
        return ![];
    }
}