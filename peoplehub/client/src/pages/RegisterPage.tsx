import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Car, Check, ChevronRight, MapPin, Search, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTelegram } from '../hooks/useTelegram';
import { registerUser } from '../services/firebase';
import { CITIES, type City } from '../config/cities';
import { CAR_BRANDS, CAR_COLORS } from '../config/carModels';
import Button from '../components/common/Button';

type Step = 'role' | 'gender' | 'city' | 'phone' | 'car' | 'codex';

export default function RegisterPage() {
  const { setAuth, userId } = useStore();
  const { tg } = useTelegram();
  const navigate = useNavigate();

  // Без userId (не вошли) — отправляем на вход, иначе выбор роли недоступен
  useEffect(() => {
    if (!userId) {
      navigate('/auth', { replace: true });
    }
  }, [userId, navigate]);

  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<'CLIENT' | 'DRIVER' | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [citySearch, setCitySearch] = useState('');
  const [phone, setPhone] = useState('+7');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | ''>('');
  const [car, setCar] = useState({
    carBrand: '',
    carModel: '',
    carColor: '',
    carYear: 2020,
    licensePlate: '',
  });
  const [codexChecks, setCodexChecks] = useState({
    payment: false,
    punctuality: false,
    respect: false,
    fairUse: false,
    personalData: false,
    itPlatform: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allCodexChecked = Object.values(codexChecks).every(Boolean);

  async function handleSubmit() {
    if (!role) return;

    try {
      setLoading(true);
      setError('');

      const payload: any = {
        role,
        phone,
        codexAccepted: true,
        personalDataConsent: true,
        itPlatformAcknowledged: true,
        city: selectedCity?.name || '',
        cityLat: selectedCity?.lat || 0,
        cityLng: selectedCity?.lng || 0,
        gender: gender || '',
      };

      if (role === 'DRIVER') {
        Object.assign(payload, car);
      }

      const result = await registerUser(userId!, payload);
      setAuth(result as any);

      tg?.HapticFeedback?.notificationOccurred('success');
      navigate(role === 'DRIVER' ? '/driver' : '/hub');
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
      tg?.HapticFeedback?.notificationOccurred('error');
    } finally {
      setLoading(false);
    }
  }

  function nextStep() {
    tg?.HapticFeedback?.impactOccurred('light');
    if (step === 'role' && role) {
      setStep('gender');
    } else if (step === 'gender' && gender) {
      setStep('city');
    } else if (step === 'city' && selectedCity) {
      setStep('phone');
    } else if (step === 'phone') {
      setStep(role === 'DRIVER' ? 'car' : 'codex');
    } else if (step === 'car') {
      setStep('codex');
    }
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-tg-bg safe-top safe-bottom">
      {/* Progress */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex gap-1.5">
          {['role', 'gender', 'city', 'phone', ...(role === 'DRIVER' ? ['car'] : []), 'codex'].map((s, i, arr) => (
            <div
              key={s}
              className={`h-1 rounded-full flex-1 transition-colors ${
                arr.indexOf(step) >= i ? 'bg-primary-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Step: Role */}
        {step === 'role' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-tg-text mb-2">Кто вы?</h2>
            <p className="text-tg-hint mb-6">Выберите вашу роль в PeopleHub</p>

            <div className="space-y-3">
              <RoleCard
                icon={<User size={28} />}
                title="Клиент"
                desc="Найдите водителя быстро и безопасно"
                selected={role === 'CLIENT'}
                onClick={() => { setRole('CLIENT'); tg?.HapticFeedback?.selectionChanged(); }}
              />
              <RoleCard
                icon={<Car size={28} />}
                title="Водитель"
                desc="Зарабатывайте без комиссии. Абонентка 200 тг/день"
                selected={role === 'DRIVER'}
                onClick={() => { setRole('DRIVER'); tg?.HapticFeedback?.selectionChanged(); }}
              />
            </div>
          </div>
        )}

        {/* Step: Gender */}
        {step === 'gender' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-tg-text mb-2">Ваш пол</h2>
            <p className="text-tg-hint mb-6">Нужно для фильтра «только женщина-водитель»</p>

            <div className="space-y-3">
              <button
                onClick={() => { setGender('MALE'); tg?.HapticFeedback?.selectionChanged(); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  gender === 'MALE'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-tg-secondaryBg'
                }`}
              >
                <span className="text-3xl">👨</span>
                <div className="flex-1">
                  <p className={`font-semibold ${gender === 'MALE' ? 'text-blue-700' : 'text-tg-text'}`}>Мужчина</p>
                </div>
                {gender === 'MALE' && <Check size={20} className="text-blue-500" />}
              </button>

              <button
                onClick={() => { setGender('FEMALE'); tg?.HapticFeedback?.selectionChanged(); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  gender === 'FEMALE'
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 bg-tg-secondaryBg'
                }`}
              >
                <span className="text-3xl">👩</span>
                <div className="flex-1">
                  <p className={`font-semibold ${gender === 'FEMALE' ? 'text-pink-700' : 'text-tg-text'}`}>Женщина</p>
                </div>
                {gender === 'FEMALE' && <Check size={20} className="text-pink-500" />}
              </button>
            </div>
          </div>
        )}

        {/* Step: City */}
        {step === 'city' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-tg-text mb-2">Ваш город</h2>
            <p className="text-tg-hint mb-4">Чтобы карта открывалась в правильном месте</p>

            <div className="relative mb-4">
              <input
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                placeholder="Поиск города..."
                className="w-full bg-tg-secondaryBg rounded-xl px-4 py-3 pl-10 text-sm text-tg-text outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tg-hint" />
            </div>

            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {CITIES
                .filter((c) => !citySearch || c.name.toLowerCase().includes(citySearch.toLowerCase()))
                .map((city) => (
                  <button
                    key={city.id}
                    onClick={() => { setSelectedCity(city); tg?.HapticFeedback?.selectionChanged(); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      selectedCity?.id === city.id
                        ? 'bg-primary-50 border-2 border-primary-500'
                        : 'bg-tg-secondaryBg border-2 border-transparent'
                    }`}
                  >
                    <MapPin size={18} className={selectedCity?.id === city.id ? 'text-primary-500' : 'text-tg-hint'} />
                    <span className={`text-sm font-medium ${selectedCity?.id === city.id ? 'text-primary-600' : 'text-tg-text'}`}>
                      {city.name}
                    </span>
                    {selectedCity?.id === city.id && (
                      <Check size={16} className="text-primary-500 ml-auto" />
                    )}
                  </button>
                ))
              }
            </div>
          </div>
        )}

        {/* Step: Phone */}
        {step === 'phone' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-tg-text mb-2">Ваш телефон</h2>
            <p className="text-tg-hint mb-6">Для связи по поездке</p>

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (777) 123-45-67"
              className="w-full bg-tg-secondaryBg rounded-xl px-4 py-3 text-lg text-tg-text outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        {/* Step: Car (Driver) */}
        {step === 'car' && (
          <CarStep car={car} setCar={setCar} tg={tg} />
        )}

        {/* Step: Codex */}
        {step === 'codex' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-tg-text mb-2">Кодекс PeopleHub</h2>
            <p className="text-tg-hint mb-6">Подтвердите, что обязуетесь</p>

            <div className="space-y-3">
              <CodexItem
                checked={codexChecks.payment}
                onChange={(v) => setCodexChecks({ ...codexChecks, payment: v })}
                text="Договариваться об оплате напрямую с водителем / пассажиром"
              />
              <CodexItem
                checked={codexChecks.punctuality}
                onChange={(v) => setCodexChecks({ ...codexChecks, punctuality: v })}
                text="Прибывать вовремя"
              />
              <CodexItem
                checked={codexChecks.respect}
                onChange={(v) => setCodexChecks({ ...codexChecks, respect: v })}
                text="Общаться уважительно"
              />
              <CodexItem
                checked={codexChecks.fairUse}
                onChange={(v) => setCodexChecks({ ...codexChecks, fairUse: v })}
                text="Не злоупотреблять системой"
              />

              <div className="h-px bg-gray-200 my-2" />

              <CodexItem
                checked={codexChecks.itPlatform}
                onChange={(v) => setCodexChecks({ ...codexChecks, itPlatform: v })}
                text="Понимаю, что PeopleHub — информационная IT-платформа и не является перевозчиком. Договор перевозки заключается мной напрямую с водителем."
              />
              <CodexItem
                checked={codexChecks.personalData}
                onChange={(v) => setCodexChecks({ ...codexChecks, personalData: v })}
                text="Даю согласие на обработку персональных данных согласно Политике конфиденциальности."
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 rounded-xl px-4 py-2 mt-4 text-sm">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div className="px-6 pb-6">
        {step === 'codex' ? (
          <Button
            fullWidth
            size="lg"
            loading={loading}
            disabled={!allCodexChecked}
            onClick={handleSubmit}
          >
            Подтвердить и начать
          </Button>
        ) : (
          <Button
            fullWidth
            size="lg"
            onClick={nextStep}
            disabled={
              (step === 'role' && !role) ||
              (step === 'gender' && !gender) ||
              (step === 'city' && !selectedCity) ||
              (step === 'phone' && phone.length < 10) ||
              (step === 'car' && (!car.carBrand || !car.carModel || !car.carColor || !car.licensePlate))
            }
            icon={<ChevronRight size={20} />}
          >
            Далее
          </Button>
        )}
      </div>
    </div>
  );
}

function CarStep({ car, setCar, tg }: {
  car: { carBrand: string; carModel: string; carColor: string; carYear: number; licensePlate: string };
  setCar: (c: any) => void;
  tg: any;
}) {
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  const selectedBrand = CAR_BRANDS.find((b) => b.name === car.carBrand);
  const filteredBrands = CAR_BRANDS.filter(
    (b) => !brandSearch || b.name.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 35 }, (_, i) => currentYear - i);

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-tg-text mb-2">Ваш автомобиль</h2>
      <p className="text-tg-hint mb-4">Выберите из списка</p>

      <div className="space-y-3">
        {/* Brand picker */}
        <div>
          <label className="text-xs font-medium text-tg-hint block mb-1">Марка *</label>
          <button
            onClick={() => { setBrandOpen(!brandOpen); setModelOpen(false); setColorOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left ${
              car.carBrand
                ? 'bg-primary-50 border-2 border-primary-400 text-tg-text'
                : 'bg-tg-secondaryBg border-2 border-transparent text-tg-hint'
            }`}
          >
            <span className={car.carBrand ? 'font-medium' : ''}>{car.carBrand || 'Выберите марку'}</span>
            <ChevronDown size={18} className={`transition-transform ${brandOpen ? 'rotate-180' : ''}`} />
          </button>

          {brandOpen && (
            <div className="mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-60 overflow-hidden">
              <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
                <div className="relative">
                  <input
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    placeholder="Поиск марки..."
                    className="w-full bg-gray-50 rounded-lg px-3 py-2 pl-8 text-sm outline-none"
                    autoFocus
                  />
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <div className="overflow-y-auto max-h-48">
                {filteredBrands.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => {
                      setCar({ ...car, carBrand: b.name, carModel: '' });
                      setBrandOpen(false);
                      setBrandSearch('');
                      tg?.HapticFeedback?.selectionChanged();
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between ${
                      car.carBrand === b.name ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {b.name}
                    {car.carBrand === b.name && <Check size={16} className="text-primary-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Model picker */}
        <div>
          <label className="text-xs font-medium text-tg-hint block mb-1">Модель *</label>
          <button
            onClick={() => {
              if (!car.carBrand) return;
              setModelOpen(!modelOpen); setBrandOpen(false); setColorOpen(false);
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left ${
              !car.carBrand ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
              car.carModel
                ? 'bg-primary-50 border-2 border-primary-400 text-tg-text'
                : 'bg-tg-secondaryBg border-2 border-transparent text-tg-hint'
            }`}
            disabled={!car.carBrand}
          >
            <span className={car.carModel ? 'font-medium' : ''}>{car.carModel || (car.carBrand ? 'Выберите модель' : 'Сначала выберите марку')}</span>
            <ChevronDown size={18} className={`transition-transform ${modelOpen ? 'rotate-180' : ''}`} />
          </button>

          {modelOpen && selectedBrand && (
            <div className="mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-52 overflow-y-auto">
              {selectedBrand.models.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setCar({ ...car, carModel: m });
                    setModelOpen(false);
                    tg?.HapticFeedback?.selectionChanged();
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between ${
                    car.carModel === m ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  {m}
                  {car.carModel === m && <Check size={16} className="text-primary-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Color picker */}
        <div>
          <label className="text-xs font-medium text-tg-hint block mb-1">Цвет *</label>
          <button
            onClick={() => { setColorOpen(!colorOpen); setBrandOpen(false); setModelOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left ${
              car.carColor
                ? 'bg-primary-50 border-2 border-primary-400 text-tg-text'
                : 'bg-tg-secondaryBg border-2 border-transparent text-tg-hint'
            }`}
          >
            <span className={car.carColor ? 'font-medium' : ''}>{car.carColor || 'Выберите цвет'}</span>
            <ChevronDown size={18} className={`transition-transform ${colorOpen ? 'rotate-180' : ''}`} />
          </button>

          {colorOpen && (
            <div className="mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
              {CAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCar({ ...car, carColor: c });
                    setColorOpen(false);
                    tg?.HapticFeedback?.selectionChanged();
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${
                    car.carColor === c ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Year picker */}
        <div>
          <label className="text-xs font-medium text-tg-hint block mb-1">Год выпуска *</label>
          <select
            value={car.carYear}
            onChange={(e) => setCar({ ...car, carYear: parseInt(e.target.value) })}
            className="w-full bg-tg-secondaryBg rounded-xl px-4 py-3 text-tg-text outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* License plate */}
        <div>
          <label className="text-xs font-medium text-tg-hint block mb-1">Гос. номер *</label>
          <input
            placeholder="123 ABC 01"
            value={car.licensePlate}
            onChange={(e) => setCar({ ...car, licensePlate: e.target.value.toUpperCase() })}
            className="w-full bg-tg-secondaryBg rounded-xl px-4 py-3 text-tg-text outline-none focus:ring-2 focus:ring-primary-500 uppercase tracking-wider"
          />
        </div>
      </div>
    </div>
  );
}

function RoleCard({ icon, title, desc, selected, onClick }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left cursor-pointer active:scale-[0.99] touch-manipulation ${
        selected
          ? 'border-primary-500 bg-primary-50'
          : 'border-transparent bg-tg-secondaryBg'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
        selected ? 'bg-primary-500 text-white' : 'bg-white text-tg-hint'
      }`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-tg-text">{title}</p>
        <p className="text-sm text-tg-hint">{desc}</p>
      </div>
      {selected && (
        <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
          <Check size={14} className="text-white" />
        </div>
      )}
    </button>
  );
}

function CodexItem({ checked, onChange, text }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  text: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3 p-4 bg-tg-secondaryBg rounded-xl text-left"
    >
      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
        checked ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
      }`}>
        {checked && <Check size={14} className="text-white" />}
      </div>
      <span className="text-sm text-tg-text">{text}</span>
    </button>
  );
}
