
describe('dictionaries', function() {
    'use strict';

    var USER_ID = 'foo',
        LANG = 'en';

    beforeEach(module('superdesk.dictionaries'));
    beforeEach(module('templates'));

    beforeEach(inject(function(session, $q) {
        spyOn(session, 'getIdentity').and.returnValue($q.when({_id: USER_ID}));
    }));

    it('can fetch global dictionaries', inject(function(api, dictionaries, $q) {
        spyOn(api, 'query').and.returnValue($q.when());
        dictionaries.fetch();
        expect(api.query).toHaveBeenCalledWith('dictionaries', {projection: {content: 0}, where: {user: {$exists: false}}});
    }));

    it('can get global dictionaries for given language', inject(function(api, dictionaries, $q, $rootScope) {
        spyOn(api, 'query').and.returnValue($q.when({_items: [{_id: 1}]}));

        var items;
        dictionaries.queryByLanguage(LANG).then(function(res) {
            items = res._items;
        });

        $rootScope.$digest();
        expect(items.length).toBe(1);
        expect(api.query).toHaveBeenCalledWith('dictionaries', {where: {
            language_id: LANG,
            user: {$exists: false},
            is_active: {$in: [true, null]}
        }});
    }));

    it('can get and update user dictionary', inject(function(api, dictionaries, $q, $rootScope) {
        var userDict = {};
        spyOn(api, 'query').and.returnValue($q.when({_items: [userDict]}));
        dictionaries.getUserDictionary(LANG);
        $rootScope.$digest();
        expect(api.query).toHaveBeenCalledWith('dictionaries', {where: {user: 'foo', language_id: 'en'}});
    }));

    it('can create dict when adding word', inject(function(dictionaries, api, $q, $rootScope) {
        spyOn(api, 'query').and.returnValue($q.when({_items: []}));
        spyOn(api, 'save').and.returnValue($q.when());

        var userDict;
        dictionaries.getUserDictionary(LANG).then(function(_userDict) {
            userDict = _userDict;
        });

        $rootScope.$digest();
        expect(userDict.language_id).toBe(LANG);
        expect(userDict.content).toEqual({});
        expect(userDict.user).toBe(USER_ID);
        expect(userDict.name).toBe(USER_ID + ':' + LANG);

        dictionaries.addWordToUserDictionary('test', userDict);
        expect(api.save).toHaveBeenCalledWith('dictionaries', userDict);
    }));

    describe('config modal directive', function() {
        var scope;

        beforeEach(inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.dictionary = {content: {foo: 1, bar: 1}};
            $controller('DictionaryEdit', {$scope: scope});
        }));

        it('can search words', function() {
            scope.filterWords('test');
            expect(scope.isNew).toBe(true);
            expect(scope.wordsCount).toBe(2);
        });

        it('can add words', function() {
            scope.addWord('test');
            expect(scope.dictionary.content.test).toBe(1);
            expect(scope.words.length).toBe(1);
            expect(scope.wordsCount).toBe(3);
        });

        it('can remove words', function() {
            scope.filterWords('foo');
            expect(scope.isNew).toBe(false);
            expect(scope.words.length).toBe(1);
            expect(scope.words[0]).toBe('foo');

            scope.removeWord('foo', 'foo');
            expect(scope.isNew).toBe(true);
            expect(scope.words.length).toBe(0);
            expect(scope.wordsCount).toBe(1);
        });
    });
});
